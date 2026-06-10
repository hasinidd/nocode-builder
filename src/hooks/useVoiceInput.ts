import { useState, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

const STT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`;

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function useVoiceInput({ onTranscript, disabled }: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    if (disabled || isRecording || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 100) {
          toast({ title: "Recording too short", description: "Please hold the mic button longer.", variant: "destructive" });
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, `recording.${mimeType.includes("webm") ? "webm" : "mp4"}`);

          const resp = await fetch(STT_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          });

          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(err.error || `HTTP ${resp.status}`);
          }

          const { transcript, detectedLanguage } = await resp.json();
          if (transcript && transcript.trim()) {
            onTranscript(transcript.trim());
            if (detectedLanguage && detectedLanguage !== "unknown") {
              console.log(`Voice detected language: ${detectedLanguage}`);
            }
          } else {
            toast({ title: "No speech detected", description: "Please try again and speak clearly.", variant: "destructive" });
          }
        } catch (e: any) {
          console.error("Transcription error:", e);
          toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250); // collect data every 250ms for smoother recording
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      setIsRecording(true);
    } catch (e: any) {
      console.error("Mic access error:", e);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access in your browser settings.",
        variant: "destructive",
      });
    }
  }, [disabled, isRecording, isTranscribing, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Ensure minimum 1 second of recording to avoid premature cutoff
      const elapsed = Date.now() - recordingStartRef.current;
      const minDuration = 1000;
      const delay = Math.max(0, minDuration - elapsed);
      
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current = null;
          setIsRecording(false);
        }
      }, delay);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, isTranscribing, toggleRecording, startRecording, stopRecording };
}
