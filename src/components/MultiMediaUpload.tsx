import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, ImageIcon, Film } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MultiMediaUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  agentId: string;
  folder?: string;
  maxFiles?: number;
  className?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB for videos

export default function MultiMediaUpload({ values, onChange, agentId, folder = "products", maxFiles = 8, className }: MultiMediaUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList) => {
    const remaining = maxFiles - values.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${maxFiles} files allowed`, variant: "destructive" });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    const invalid = filesToUpload.filter(f => !ACCEPTED_TYPES.includes(f.type));
    if (invalid.length) {
      toast({ title: "Only images and videos allowed", description: `Unsupported: ${invalid.map(f => f.name).join(", ")}`, variant: "destructive" });
      return;
    }
    const tooLarge = filesToUpload.filter(f => f.size > MAX_SIZE);
    if (tooLarge.length) {
      toast({ title: "Files must be under 50MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${agentId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error } = await supabase.storage.from("agent-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        toast({ title: "Upload failed", description: `${file.name}: ${error.message}`, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("agent-media").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length) {
      onChange([...values, ...newUrls]);
    }
    setUploading(false);
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }}
      />

      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative group w-20 h-20">
            {isVideo(url) ? (
              <div className="w-20 h-20 rounded-lg border border-border/50 bg-secondary/30 flex items-center justify-center">
                <Film className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border/50" />
            )}
            <button
              onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
            {isVideo(url) && (
              <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white px-1 rounded">VID</span>
            )}
          </div>
        ))}

        {values.length < maxFiles && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span className="text-[10px]">{values.length ? "Add more" : "Upload"}</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {values.length}/{maxFiles} files • Images & videos up to 50MB
      </p>
    </div>
  );
}