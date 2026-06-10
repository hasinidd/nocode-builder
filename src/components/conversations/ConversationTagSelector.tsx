import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tag, Pencil, Plus, X, Check, Trash2, Loader2 } from "lucide-react";

interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

interface ConversationTag {
  id: string;
  tag_id: string;
  tag?: TagDefinition;
}

const TAG_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

export default function ConversationTagSelector({
  conversationId,
  assignedTags,
  onTagsChanged,
}: {
  conversationId: string;
  assignedTags: ConversationTag[];
  onTagsChanged: () => void;
}) {
  const [tagDefs, setTagDefs] = useState<TagDefinition[]>([]);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const loadTagDefinitions = async () => {
    const { data } = await supabase
      .from("tag_definitions")
      .select("id, name, color")
      .order("created_at", { ascending: true });
    setTagDefs(data || []);
  };

  useEffect(() => {
    loadTagDefinitions();
  }, []);

  const assignedTagIds = assignedTags.map((t) => t.tag_id);

  const toggleTag = async (tagId: string) => {
    setLoading(true);
    try {
      if (assignedTagIds.includes(tagId)) {
        await supabase
          .from("conversation_tags")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("tag_id", tagId);
      } else {
        await supabase
          .from("conversation_tags")
          .insert({ conversation_id: conversationId, tag_id: tagId });
      }
      onTagsChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("tag_definitions").insert({
        user_id: user.id,
        name: newTagName.trim(),
        color: newTagColor,
      });
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0]);
      await loadTagDefinitions();
      toast({ title: "Tag created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteTagDef = async (tagId: string) => {
    setLoading(true);
    try {
      await supabase.from("tag_definitions").delete().eq("id", tagId);
      await loadTagDefinitions();
      onTagsChanged();
      toast({ title: "Tag deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm shrink-0">
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Tag</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</p>
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Manage tags">
                <Pencil className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Tags</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Create new tag</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag name..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createTag()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={createTag} disabled={loading || !newTagName.trim()}>
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        className="h-5 w-5 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c,
                          borderColor: newTagColor === c ? "hsl(var(--foreground))" : "transparent",
                        }}
                        onClick={() => setNewTagColor(c)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Existing tags</p>
                  {tagDefs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tags defined yet</p>
                  ) : (
                    tagDefs.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-secondary/50">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="text-sm">{t.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteTagDef(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {tagDefs.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">No tags yet. Click the pencil icon to create some.</p>
        ) : (
          <div className="space-y-0.5">
            {tagDefs.map((t) => {
              const isAssigned = assignedTagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-secondary/50 transition-colors text-left"
                  onClick={() => toggleTag(t.id)}
                  disabled={loading}
                >
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="flex-1 truncate">{t.name}</span>
                  {isAssigned && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TagBadges({
  tags,
  onRemove,
  compact = false,
}: {
  tags: { tag_id: string; tag?: TagDefinition }[];
  onRemove?: (tagId: string) => void;
  compact?: boolean;
}) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((ct) => (
        <Badge
          key={ct.tag_id}
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 gap-0.5 font-normal"
          style={{
            backgroundColor: ct.tag?.color ? `${ct.tag.color}20` : undefined,
            color: ct.tag?.color || undefined,
            borderColor: ct.tag?.color ? `${ct.tag.color}40` : undefined,
          }}
        >
          {ct.tag?.name || "..."}
          {onRemove && !compact && (
            <button
              className="ml-0.5 hover:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(ct.tag_id);
              }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}
