import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceModeToggleProps {
  voiceMode: boolean;
  onToggle: () => void;
  isSpeaking?: boolean;
  className?: string;
}

export default function VoiceModeToggle({ voiceMode, onToggle, isSpeaking, className }: VoiceModeToggleProps) {
  return (
    <Button
      type="button"
      variant={voiceMode ? "default" : "ghost"}
      size="sm"
      onClick={onToggle}
      title={voiceMode ? "Voice mode ON — click to disable" : "Enable voice mode"}
      className={cn(
        "gap-1.5 text-xs h-7 px-2",
        voiceMode && "bg-primary text-primary-foreground",
        isSpeaking && "animate-pulse",
        className
      )}
    >
      {voiceMode ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{voiceMode ? "Voice On" : "Voice"}</span>
    </Button>
  );
}
