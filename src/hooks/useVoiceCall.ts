import { useState, useRef, useCallback, useEffect } from "react";

const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-token`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

export interface VoiceCaption {
  role: "user" | "assistant";
  text: string;
}

interface UseVoiceCallOptions {
  onSendMessage: (text: string) => Promise<string>;
  onCallStart?: () => void;
  onCallEnd?: () => void;
}

export function useVoiceCall({ onSendMessage, onCallStart, onCallEnd }: UseVoiceCallOptions) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captions, setCaptions] = useState<VoiceCaption[]>([]);
  const [callDuration, setCallDuration] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimRef = useRef("");
  const pauseStreamingRef = useRef(false);
  const dgKeyRef = useRef("");

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  const cleanTextForDisplay = (text: string): string => {
    return text
      // Remove action markers like [STEP: ...] content [/STEP], [SUMMARY]...[/SUMMARY], [BUTTONS: ...]
      .replace(/\[STEP:[^\]]*\]/g, "")
      .replace(/\[\/STEP\]/g, "")
      .replace(/\[SUMMARY\]/g, "")
      .replace(/\[\/SUMMARY\]/g, "")
      .replace(/\[BUTTONS:[^\]]*\]/g, "")
      // Remove CRUD markers
      .replace(/\[(ADD|UPDATE|DELETE|BULK_UPDATE|BULK_EDIT|SCRAPE_URL|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE|ADD_PAYMENT_METHOD|UPDATE_PAYMENT_METHOD|DELETE_PAYMENT_METHOD|ADD_AVAILABILITY|UPDATE_AVAILABILITY|DELETE_AVAILABILITY|UPDATE_ORDER|UPDATE_BOOKING|UPDATE_INQUIRY|UPDATE_AGENT|ADD_PRODUCT|UPDATE_PRODUCT|DELETE_PRODUCT|ADD_SERVICE|UPDATE_SERVICE|DELETE_SERVICE)_?[A-Z]*\][\s\S]*?\[\/\1_?[A-Z]*\]/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_~`#>]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const speakText = useCallback(async (text: string): Promise<void> => {
    const clean = cleanTextForDisplay(text);
    if (!clean || !activeRef.current) return;

    setIsSpeaking(true);
    try {
      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: clean }),
      });

      if (!resp.ok) throw new Error("TTS failed");

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      return new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          resolve();
        };
        audio.play().catch(() => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          resolve();
        });
      });
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const handleTranscriptComplete = useCallback(
    async (transcript: string) => {
      if (!transcript.trim() || !activeRef.current) return;

      pauseStreamingRef.current = true;
      setCaptions((prev) => [...prev, { role: "user", text: transcript }]);
      setIsListening(false);
      setIsProcessing(true);

      try {
        const response = await onSendMessage(transcript);
        if (activeRef.current && response) {
          const displayResponse = cleanTextForDisplay(response);
          setCaptions((prev) => [...prev, { role: "assistant", text: displayResponse || response }]);
          setIsProcessing(false);
          await speakText(response);
        } else {
          setIsProcessing(false);
        }
      } catch {
        setIsProcessing(false);
      }

      if (activeRef.current) {
        pauseStreamingRef.current = false;
        setIsListening(true);
      }
    },
    [onSendMessage, speakText]
  );

  const finalizeCurrentUtterance = useCallback(() => {
    const finalText = interimRef.current.trim();
    if (!finalText || !activeRef.current || pauseStreamingRef.current) return;

    interimRef.current = "";
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }

    void handleTranscriptComplete(finalText);
  }, [handleTranscriptComplete]);

  const connectWebSocket = useCallback(
    async (dgKey: string) => {
      if (!activeRef.current) return;

      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        });
      }

      const wsUrl =
        "wss://api.deepgram.com/v1/listen?" +
        "model=nova-2&" +
        "encoding=linear16&sample_rate=16000&channels=1&" +
        "smart_format=true&punctuate=true&" +
        "interim_results=true&vad_events=true&" +
        "endpointing=800&utterance_end_ms=2500";

      const ws = new WebSocket(wsUrl, ["token", dgKey]);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!activeRef.current) {
          ws.close();
          return;
        }

        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }

        setIsListening(true);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(streamRef.current!);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (
            ws.readyState !== WebSocket.OPEN ||
            !activeRef.current ||
            pauseStreamingRef.current
          ) {
            return;
          }

          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          ws.send(int16.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        if (!activeRef.current) return;

        try {
          const data = JSON.parse(event.data);

          if (data.type === "UtteranceEnd") {
            finalizeCurrentUtterance();
            return;
          }

          if (data.type !== "Results") return;

          const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
          if (!transcript) return;

          if (data.is_final) {
            interimRef.current += (interimRef.current ? " " : "") + transcript;
          }

          if (data.speech_final === true) {
            finalizeCurrentUtterance();
            return;
          }

          if (data.is_final) {
            if (finalizeTimerRef.current) clearTimeout(finalizeTimerRef.current);
            finalizeTimerRef.current = setTimeout(() => {
              finalizeCurrentUtterance();
            }, 2000);
          }
        } catch {
          // ignore malformed websocket events
        }
      };

      ws.onclose = () => {
        if (!activeRef.current || !dgKeyRef.current) return;
        if (reconnectTimerRef.current) return;

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (activeRef.current && dgKeyRef.current) {
            void connectWebSocket(dgKeyRef.current);
          }
        }, 500);
      };

      ws.onerror = () => {
        ws.close();
      };
    },
    [finalizeCurrentUtterance]
  );

  const startCall = useCallback(async () => {
    activeRef.current = true;
    pauseStreamingRef.current = false;
    interimRef.current = "";

    setCaptions([]);
    setIsCallActive(true);
    onCallStart?.();

    try {
      const resp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      if (!resp.ok) throw new Error("Failed to get token");
      const { key } = await resp.json();
      if (!key) throw new Error("No token returned");

      dgKeyRef.current = key;
      await connectWebSocket(key);
    } catch (err) {
      console.error("Failed to start voice call:", err);
      activeRef.current = false;
      dgKeyRef.current = "";
      setIsCallActive(false);
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [connectWebSocket, onCallStart]);

  const endCall = useCallback(() => {
    activeRef.current = false;
    dgKeyRef.current = "";
    pauseStreamingRef.current = false;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // no-op
      }
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    interimRef.current = "";

    setIsCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    onCallEnd?.();
  }, [onCallEnd]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) track.enabled = !track.enabled;
    }
  }, []);

  return {
    isCallActive,
    isListening,
    isSpeaking,
    isProcessing,
    captions,
    callDuration,
    startCall,
    endCall,
    toggleMute,
  };
}
