import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Image as ImageIcon, Video, FileAudio, FileText, Type,
  Upload, ArrowUp, ArrowDown, X, Check, Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type ItemType = "text" | "image" | "video" | "audio" | "file";

interface FaqItem {
  id?: string;
  item_type: ItemType;
  content: string;
  media_url: string;
  file_name: string;
  sort_order: number;
}

const TYPE_CONFIG: Record<ItemType, { icon: any; label: string; accept?: string; color: string }> = {
  text: { icon: Type, label: "Text", color: "text-primary" },
  image: { icon: ImageIcon, label: "Image", accept: "image/*", color: "text-emerald-400" },
  video: { icon: Video, label: "Video", accept: "video/*", color: "text-blue-400" },
  audio: { icon: FileAudio, label: "Audio", accept: "audio/*", color: "text-amber-400" },
  file: { icon: FileText, label: "Document", accept: ".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx", color: "text-rose-400" },
};

interface Props {
  agentId: string;
  faqId: string;
  onChange?: () => void;
}

export default function FaqSequenceEditor({ agentId, faqId, onChange }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!faqId) { setLoading(false); return; }
    loadItems();
  }, [faqId]);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("faq_items")
      .select("*")
      .eq("faq_id", faqId)
      .order("sort_order", { ascending: true });
    if (data) setItems(data.map(d => ({ ...d, item_type: d.item_type as ItemType })));
    setLoading(false);
  };

  // Debounced auto-save whenever items change
  const scheduleAutoSave = (next: FaqItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistItems(next), 600);
  };

  const persistItems = async (next: FaqItem[]) => {
    if (!faqId) return;
    setSaveStatus("saving");
    try {
      // Filter empty rows: text item must have content, media item must have media_url
      const valid = next.filter(it =>
        it.item_type === "text" ? !!(it.content && it.content.trim()) : !!it.media_url
      );

      await supabase.from("faq_items").delete().eq("faq_id", faqId);
      if (valid.length > 0) {
        const rows = valid.map((it, i) => ({
          faq_id: faqId,
          agent_id: agentId,
          item_type: it.item_type,
          content: it.content || null,
          media_url: it.media_url || null,
          file_name: it.file_name || null,
          sort_order: i,
        }));
        const { error } = await supabase.from("faq_items").insert(rows);
        if (error) throw error;
      }
      setSaveStatus("saved");
      onChange?.();
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (err: any) {
      setSaveStatus("idle");
      toast({ title: "Auto-save failed", description: err.message, variant: "destructive" });
    }
  };

  const addItem = (type: ItemType) => {
    const next = [...items, {
      item_type: type, content: "", media_url: "", file_name: "", sort_order: items.length,
    }];
    setItems(next);
    // Don't auto-save empty new rows — wait until they have content
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) await supabase.from("faq_items").delete().eq("id", item.id);
    const next = items.filter((_, i) => i !== index).map((it, i) => ({ ...it, sort_order: i }));
    setItems(next);
    scheduleAutoSave(next);
    onChange?.();
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((it, i) => ({ ...it, sort_order: i }));
    setItems(reordered);
    scheduleAutoSave(reordered);
  };

  const updateItem = (index: number, field: keyof FaqItem, value: string) => {
    const next = items.map((it, i) => i === index ? { ...it, [field]: value } : it);
    setItems(next);
    scheduleAutoSave(next);
  };

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB

  const uploadFile = async (index: number, file: File) => {
    if (!user) return;

    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const kind = file.type.startsWith("video/") ? "Video" : file.type.startsWith("audio/") ? "Audio" : file.type.startsWith("image/") ? "Image" : "File";
      toast({
        title: `${kind} is too large`,
        description: `${kind} must be under 50MB. This file is ${sizeMb}MB. Please compress or trim it and try again.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(String(index));
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${agentId}/faq-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("agent-media").upload(path, file);
    if (error) {
      const isSizeErr = /exceeded|too large|maximum|size/i.test(error.message);
      toast({
        title: isSizeErr && file.type.startsWith("video/") ? "Video is too large" : "Upload failed",
        description: isSizeErr ? `File exceeds the 50MB limit. Please compress and try again.` : error.message,
        variant: "destructive",
      });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("agent-media").getPublicUrl(path);
    const next = items.map((it, i) =>
      i === index ? { ...it, media_url: urlData.publicUrl, file_name: file.name } : it
    );
    setItems(next);
    setUploading(null);
    scheduleAutoSave(next);
  };

  const saveAll = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persistItems(items);
    await loadItems();
    toast({ title: "Sequence saved!" });
  };

  const renderPreview = (item: FaqItem) => {
    if (!item.media_url) return null;
    switch (item.item_type) {
      case "image": return <img src={item.media_url} alt={item.file_name} className="rounded-lg max-h-32 object-cover mt-2" />;
      case "video": return <video src={item.media_url} controls className="rounded-lg max-h-32 mt-2" />;
      case "audio": return <audio src={item.media_url} controls className="mt-2 w-full" />;
      case "file": return <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">📎 {item.file_name}</a>;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          The bot will send these in order when this FAQ is matched. Changes auto-save.
        </p>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          <Button onClick={saveAll} disabled={loading || saveStatus === "saving"} size="sm">
            Save Now
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addItem(type as ItemType)} className="gap-1.5">
            <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
            {config.label}
          </Button>
        ))}
      </div>

      <AnimatePresence>
        {items.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            No items yet. Add a text, image, or video step above.
          </div>
        )}

        {items.map((item, index) => {
          const config = TYPE_CONFIG[item.item_type];
          const Icon = config.icon;
          return (
            <motion.div
              key={item.id || `new-${index}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="glass border-border/50 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button onClick={() => moveItem(index, "up")} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <div className="rounded-md bg-secondary p-1.5">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <button onClick={() => moveItem(index, "down")} disabled={index === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Step {index + 1} — {config.label}
                      </span>
                      <button onClick={() => removeItem(index)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {item.item_type === "text" ? (
                      <Textarea
                        value={item.content}
                        onChange={(e) => updateItem(index, "content", e.target.value)}
                        placeholder="Type message..."
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <div className="space-y-2">
                        {!item.media_url ? (
                          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary/50 transition-colors">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {uploading === String(index) ? "Uploading..." : `Click to upload ${config.label.toLowerCase()}`}
                            </span>
                            <input
                              type="file"
                              accept={config.accept}
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(index, f); }}
                            />
                          </label>
                        ) : (
                          <div>
                            {renderPreview(item)}
                            <button
                              onClick={() => {
                                const next = items.map((it, i) => i === index ? { ...it, media_url: "", file_name: "" } : it);
                                setItems(next);
                                scheduleAutoSave(next);
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive mt-1"
                            >
                              Remove file
                            </button>
                          </div>
                        )}

                        <Input
                          value={item.content}
                          onChange={(e) => updateItem(index, "content", e.target.value)}
                          placeholder="Optional caption..."
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
