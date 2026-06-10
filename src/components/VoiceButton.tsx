import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: "icon" | "sm" | "default";
}

export default function VoiceButton({
  isRecording,
  isTranscribing,
  onClick,
  disabled,
  className,
  size = "icon",
}: VoiceButtonProps) {
  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "ghost"}
      size={size}
      onClick={onClick}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice input"}
      className={cn(
        "shrink-0 relative",
        isRecording && "animate-pulse",
        className
      )}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <>
          <MicOff className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
