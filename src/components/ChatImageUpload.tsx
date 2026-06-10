import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChatImageUploadProps {
  agentId: string;
  pendingImages: string[];
  onImagesChange: (urls: string[]) => void;
  disabled?: boolean;
}

export default function ChatImageUpload({ agentId, pendingImages, onImagesChange, disabled }: ChatImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only images allowed", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${agentId}/chat/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("agent-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("agent-media").getPublicUrl(path);
    onImagesChange([...pendingImages, urlData.publicUrl]);
    setUploading(false);
  };

  const remove = (index: number) => {
    onImagesChange(pendingImages.filter((_, i) => i !== index));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); }}
      />

      {pendingImages.map((url, i) => (
        <div key={i} className="relative group w-10 h-10 shrink-0">
          <img src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-border/50" />
          <button
            onClick={() => remove(i)}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading || disabled}
        className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
        title="Attach image"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </button>
    </div>
  );
}
