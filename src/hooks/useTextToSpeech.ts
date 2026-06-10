import { useState, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any current playback
    stopSpeaking();

    // Clean text: strip markdown, action markers, interactive UI markers, etc.
    const cleanText = text
      .replace(/\[STEP:[^\]]*\]/g, "")
      .replace(/\[\/STEP\]/g, "")
      .replace(/\[SUMMARY\]/g, "")
      .replace(/\[\/SUMMARY\]/g, "")
      .replace(/\[BUTTONS:[^\]]*\]/g, "")
      .replace(/\[(ADD|UPDATE|DELETE|BULK_UPDATE|BULK_EDIT|SCRAPE_URL|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS)[^\]]*\][\s\S]*?\[\/[^\]]+\]/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_~`#>]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleanText) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSpeaking(true);

    try {
      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error("TTS error:", e);
      toast({ title: "Voice playback failed", description: e.message, variant: "destructive" });
      setIsSpeaking(false);
    }
  }, [stopSpeaking]);

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode(prev => {
      if (prev) stopSpeaking();
      return !prev;
    });
  }, [stopSpeaking]);

  return { voiceMode, toggleVoiceMode, speak, isSpeaking, stopSpeaking };
}
