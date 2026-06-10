import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, GripVertical, Image, Video, FileAudio, FileText, Type,
  Upload, ArrowUp, ArrowDown, X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type ItemType = "text" | "image" | "video" | "audio" | "file";

interface WelcomeItem {
  id?: string;
  item_type: ItemType;
  content: string;
  media_url: string;
  file_name: string;
  sort_order: number;
  isNew?: boolean;
}

const TYPE_CONFIG: Record<ItemType, { icon: any; label: string; accept?: string; color: string }> = {
  text: { icon: Type, label: "Text Message", color: "text-primary" },
  image: { icon: Image, label: "Image", accept: "image/*", color: "text-emerald-400" },
  video: { icon: Video, label: "Video", accept: "video/*", color: "text-blue-400" },
  audio: { icon: FileAudio, label: "Audio", accept: "audio/*", color: "text-amber-400" },
  file: { icon: FileText, label: "Document/PDF", accept: ".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx", color: "text-rose-400" },
};

interface Props {
  agentId: string;
  onSequenceChange?: () => void;
}

export default function WelcomeSequenceEditor({ agentId, onSequenceChange }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<WelcomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [agentId]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("welcome_items")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order", { ascending: true });
    if (data) setItems(data.map(d => ({ ...d, item_type: d.item_type as ItemType })));
    setLoading(false);
  };

  const addItem = (type: ItemType) => {
    const newItem: WelcomeItem = {
      item_type: type,
      content: "",
      media_url: "",
      file_name: "",
      sort_order: items.length,
      isNew: true,
    };
    setItems([...items, newItem]);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) {
      await supabase.from("welcome_items").delete().eq("id", item.id);
    }
    const updated = items.filter((_, i) => i !== index).map((it, i) => ({ ...it, sort_order: i }));
    setItems(updated);
    onSequenceChange?.();
    toast({ title: "Item removed" });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems.map((it, i) => ({ ...it, sort_order: i })));
  };

  const updateItem = (index: number, field: keyof WelcomeItem, value: string) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
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
    const path = `${user.id}/${agentId}/${Date.now()}.${ext}`;

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

    updateItem(index, "media_url", urlData.publicUrl);
    updateItem(index, "file_name", file.name);
    setUploading(null);
    toast({ title: "File uploaded!" });
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      // Delete existing and reinsert all
      await supabase.from("welcome_items").delete().eq("agent_id", agentId);

      if (items.length > 0) {
        const rows = items.map((it, i) => ({
          agent_id: agentId,
          item_type: it.item_type,
          content: it.content || null,
          media_url: it.media_url || null,
          file_name: it.file_name || null,
          sort_order: i,
        }));
        const { error } = await supabase.from("welcome_items").insert(rows);
        if (error) throw error;
      }

      await loadItems();
      onSequenceChange?.();
      toast({ title: "Welcome sequence saved!" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderMediaPreview = (item: WelcomeItem) => {
    if (!item.media_url) return null;

    switch (item.item_type) {
      case "image":
        return <img src={item.media_url} alt={item.file_name} className="rounded-lg max-h-32 object-cover mt-2" />;
      case "video":
        return <video src={item.media_url} controls className="rounded-lg max-h-32 mt-2" />;
      case "audio":
        return <audio src={item.media_url} controls className="mt-2 w-full" />;
      case "file":
        return (
          <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">
            📎 {item.file_name || "Download file"}
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-lg">Welcome Sequence</h3>
          <p className="text-sm text-muted-foreground">
            Add messages, images, videos, audio, or documents that your agent sends when a conversation starts.
          </p>
        </div>
        <Button onClick={saveAll} disabled={loading} size="sm" className="bg-primary hover:bg-primary/90">
          Save Sequence
        </Button>
      </div>

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => addItem(type as ItemType)}
            className="gap-1.5"
          >
            <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
            {config.label}
          </Button>
        ))}
      </div>

      {/* Items list */}
      <AnimatePresence>
        {items.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No welcome items yet. Add a text message, image, or other media above.
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
              className="group"
            >
              <Card className="glass border-border/50 p-4">
                <div className="flex items-start gap-3">
                  {/* Reorder + type icon */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <div className={`rounded-md bg-secondary p-1.5`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={index === items.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                        placeholder="Type your welcome message..."
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <div className="space-y-2">
                        {/* File upload */}
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
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadFile(index, file);
                              }}
                            />
                          </label>
                        ) : (
                          <div>
                            {renderMediaPreview(item)}
                            <button
                              onClick={() => { updateItem(index, "media_url", ""); updateItem(index, "file_name", ""); }}
                              className="text-xs text-muted-foreground hover:text-destructive mt-1"
                            >
                              Remove file
                            </button>
                          </div>
                        )}

                        {/* Optional caption */}
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
