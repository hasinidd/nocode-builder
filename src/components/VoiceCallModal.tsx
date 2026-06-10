import { useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, MicOff, Mic, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceCaption } from "@/hooks/useVoiceCall";

interface VoiceCallModalProps {
  open: boolean;
  onClose: () => void;
  agentName: string;
  agentAvatarUrl?: string | null;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  captions: VoiceCaption[];
  callDuration: number;
  onEndCall: () => void;
  onToggleMute: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoiceCallModal({
  open,
  onClose,
  agentName,
  agentAvatarUrl,
  isListening,
  isSpeaking,
  isProcessing,
  captions,
  callDuration,
  onEndCall,
  onToggleMute,
}: VoiceCallModalProps) {
  const captionsEndRef = useRef<HTMLDivElement>(null);
  const isMuted = useRef(false);

  useEffect(() => {
    captionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [captions]);

  const handleEndCall = () => {
    onEndCall();
    onClose();
  };

  const handleToggleMute = () => {
    isMuted.current = !isMuted.current;
    onToggleMute();
  };

  const statusText = isSpeaking
    ? "Speaking..."
    : isProcessing
    ? "Thinking..."
    : isListening
    ? "Listening..."
    : "Connecting...";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleEndCall(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-background via-background to-background/95 border-border/30 gap-0">
        {/* Call header area with avatar */}
        <div className="relative pt-10 pb-6 px-6 flex flex-col items-center">
          {/* Animated rings behind avatar */}
          <div className="relative">
            {isSpeaking && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 96, height: 96, top: -8, left: -8 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/20"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  style={{ width: 96, height: 96, top: -8, left: -8 }}
                />
              </>
            )}
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-accent/40"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ width: 96, height: 96, top: -8, left: -8 }}
              />
            )}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
              {agentAvatarUrl ? (
                <img src={agentAvatarUrl} alt={agentName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-foreground">
                  {agentName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <h2 className="mt-4 text-lg font-display font-semibold">{agentName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <motion.span
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? "bg-primary" : isListening ? "bg-accent" : "bg-muted-foreground"
              }`}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-sm text-muted-foreground">{statusText}</span>
          </div>
          <span className="text-xs text-muted-foreground/60 mt-1 font-mono">
            {formatDuration(callDuration)}
          </span>
        </div>

        {/* Captions area */}
        <div className="px-4 pb-4 flex-1 max-h-[220px] min-h-[120px] overflow-y-auto">
          <AnimatePresence>
            {captions.map((caption, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 mb-2 ${caption.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
                    caption.role === "user"
                      ? "bg-primary/20 text-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    {caption.role === "user" ? "You" : agentName}
                  </span>
                  {caption.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {captions.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">
              Start speaking — captions will appear here
            </p>
          )}
          <div ref={captionsEndRef} />
        </div>

        {/* Call controls */}
        <div className="border-t border-border/30 px-6 py-5 flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-border/50"
            onClick={handleToggleMute}
          >
            {isMuted.current ? (
              <MicOff className="h-5 w-5 text-destructive" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          <Button
            onClick={handleEndCall}
            className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30"
            size="icon"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          <div className="h-12 w-12 rounded-full border border-border/50 flex items-center justify-center">
            <Volume2 className={`h-5 w-5 ${isSpeaking ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
