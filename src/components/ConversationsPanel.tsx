import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import ConversationTagSelector, { TagBadges } from "@/components/conversations/ConversationTagSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Search, Trash2, Bot, Phone, User, Send, Loader2, Mic, ArrowLeft, SmilePlus, Meh, Frown, Download } from "lucide-react";
import FollowUpConfig from "@/components/FollowUpConfig";
import { useIsMobile } from "@/hooks/use-mobile";

interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

interface ConversationTagItem {
  id: string;
  tag_id: string;
  conversation_id: string;
  tag?: TagDefinition;
}

interface Conversation {
  id: string;
  session_id: string | null;
  created_at: string;
  bot_paused: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  messageCount: number;
  tags: ConversationTagItem[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function ConversationsPanel({ agentId }: { agentId: string }) {
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const syncedNamesRef = useRef(false);

  const loadConversations = useCallback(async () => {
    let { data: convos } = await supabase
      .from("conversations")
      .select("id, session_id, created_at, bot_paused, customer_name, customer_phone")
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false });

    if (!convos || convos.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const hasMissingNames = convos.some(
      (c) => (!c.customer_name || !c.customer_name.trim()) && c.session_id?.startsWith("wa_")
    );

    if (hasMissingNames && !syncedNamesRef.current) {
      syncedNamesRef.current = true;
      await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "sync_contact_names", agent_id: agentId },
      });

      const { data: refreshedConvos } = await supabase
        .from("conversations")
        .select("id, session_id, created_at, bot_paused, customer_name, customer_phone")
        .eq("agent_id", agentId)
        .order("updated_at", { ascending: false });

      if (refreshedConvos?.length) {
        convos = refreshedConvos;
      }
    }

    const convoIds = convos.map(c => c.id);
    const [{ data: msgs }, { data: tagData }, { data: tagDefs }] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id, content, created_at, role")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_tags")
        .select("id, conversation_id, tag_id")
        .in("conversation_id", convoIds),
      supabase
        .from("tag_definitions")
        .select("id, name, color")
        .order("sort_order", { ascending: true }),
    ]);

    const tagDefMap: Record<string, { id: string; name: string; color: string }> = {};
    tagDefs?.forEach((t) => { tagDefMap[t.id] = t; });

    const tagMap: Record<string, ConversationTagItem[]> = {};
    tagData?.forEach((ct) => {
      if (!tagMap[ct.conversation_id]) tagMap[ct.conversation_id] = [];
      tagMap[ct.conversation_id].push({ ...ct, tag: tagDefMap[ct.tag_id] });
    });

    const msgMap: Record<string, { count: number; last?: string; lastTime?: string }> = {};
    msgs?.forEach(m => {
      if (!msgMap[m.conversation_id]) {
        msgMap[m.conversation_id] = { count: 0 };
      }
      msgMap[m.conversation_id].count++;
      if (!msgMap[m.conversation_id].last) {
        msgMap[m.conversation_id].last = m.content;
        msgMap[m.conversation_id].lastTime = m.created_at;
      }
    });

    setConversations(convos.map(c => ({
      ...c,
      lastMessage: msgMap[c.id]?.last,
      lastMessageTime: msgMap[c.id]?.lastTime,
      messageCount: msgMap[c.id]?.count || 0,
      tags: tagMap[c.id] || [],
    })));
    setLoading(false);
  }, [agentId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = async (convoId: string) => {
    setLoadingMessages(true);
    setSelectedId(convoId);
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMessages(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  // Realtime subscription for conversation_tags changes
  useEffect(() => {
    const channel = supabase
      .channel("conversation-tags-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversation_tags",
      }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  const toggleBotPause = async (convoId: string, currentPaused: boolean) => {
    const newVal = !currentPaused;
    await supabase.from("conversations").update({ bot_paused: newVal }).eq("id", convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, bot_paused: newVal } : c));
    toast({ title: newVal ? "Bot paused for this contact" : "Bot reactivated for this contact" });
  };

  const deleteConversation = async (convoId: string) => {
    try {
      // Delete messages first, then conversation
      await supabase.from("messages").delete().eq("conversation_id", convoId);
      await supabase.from("conversations").delete().eq("id", convoId);
      setConversations(prev => prev.filter(c => c.id !== convoId));
      if (selectedId === convoId) {
        setSelectedId(null);
        setMessages([]);
      }
      toast({ title: "Chat deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      // Find the conversation's WhatsApp session info
      const convo = conversations.find(c => c.id === selectedId);
      const sessionId = convo?.session_id;

      // Save message to DB
      await supabase.from("messages").insert({
        conversation_id: selectedId,
        role: "assistant",
        content: replyText.trim(),
      });

      // If it's a WhatsApp conversation, send via WhatsApp
      if (sessionId && sessionId.startsWith("wa_")) {
        const phone = sessionId.replace("wa_", "").split("_")[0];
        // Find the WhatsApp session for this agent
        const { data: waSession } = await supabase
          .from("whatsapp_sessions")
          .select("id")
          .eq("agent_id", agentId)
          .eq("status", "connected")
          .limit(1)
          .single();

        if (waSession) {
          await supabase.functions.invoke("whatsapp-manage", {
            body: { action: "send_message", session_id: waSession.id, to: phone, text: replyText.trim() },
          });
        }
      }

      setReplyText("");
    } catch (err: any) {
      toast({ title: "Error sending", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const selectedConvo = conversations.find(c => c.id === selectedId);
  // A "real" WhatsApp phone is 8–15 digits. Anything longer (e.g. WhatsApp LID like 17609835688032)
  // is an opaque privacy identifier — surface a friendly label instead of the raw number.
  const isRealPhone = (p?: string | null) => !!p && /^\+?\d{8,15}$/.test(p.trim());
  const prettyPhone = (p?: string | null) => {
    if (!p) return "";
    if (isRealPhone(p)) return p.startsWith("+") ? p : `+${p}`;
    return "Private contact";
  };
  const displayName = (c: Conversation) =>
    c.customer_name ||
    (isRealPhone(c.customer_phone) ? c.customer_phone! : null) ||
    "WhatsApp User";
  const displayPhone = (c: Conversation) => {
    if (isRealPhone(c.customer_phone)) return prettyPhone(c.customer_phone);
    const fromSession = c.session_id?.replace("wa_", "").split("_")[0];
    if (isRealPhone(fromSession)) return prettyPhone(fromSession);
    return "Private contact";
  };

  const classifySentiment = (c: Conversation): "positive" | "neutral" | "negative" => {
    const text = (c.lastMessage || "").toLowerCase();
    const posWords = ["thank", "thanks", "great", "good", "love", "awesome", "perfect", "excellent", "happy", "appreciate", "wonderful", "yes", "sure", "👍", "❤️", "😊", "🙏"];
    const negWords = ["bad", "worst", "terrible", "hate", "angry", "upset", "cancel", "refund", "complaint", "horrible", "disappointed", "problem", "issue", "wrong", "😡", "👎", "😤"];
    if (posWords.some(w => text.includes(w))) return "positive";
    if (negWords.some(w => text.includes(w))) return "negative";
    return "neutral";
  };

  const filtered = conversations.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!(displayName(c).toLowerCase().includes(q) || displayPhone(c).toLowerCase().includes(q) || (c.lastMessage || "").toLowerCase().includes(q))) return false;
    }
    if (sentimentFilter !== "all" && classifySentiment(c) !== sentimentFilter) return false;
    return true;
  });

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-display font-bold text-foreground">Conversations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">WhatsApp chat history and live messages</p>
        </div>
        <FollowUpConfig agentId={agentId} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-2 flex-1">
          {(["all", "positive", "neutral", "negative"] as const).map((s) => {
            const icons = { all: null, positive: SmilePlus, neutral: Meh, negative: Frown };
            const Icon = icons[s];
            return (
              <Button
                key={s}
                size="sm"
                variant={sentimentFilter === s ? "default" : "outline"}
                className="text-[10px] sm:text-xs capitalize px-1.5 sm:px-3 h-8"
                onClick={() => setSentimentFilter(s)}
              >
                {Icon && <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" />}
                <span className="truncate">{s}</span>
              </Button>
            );
          })}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs shrink-0 h-8"
          onClick={() => {
            if (filtered.length === 0) {
              toast({ title: "No data", description: "No conversations to export" });
              return;
            }
            const headers = ["Name", "Phone", "Last Message", "Sentiment", "Messages", "Created"];
            const rows = filtered.map(c => [
              displayName(c),
              displayPhone(c),
              `"${(c.lastMessage || "").replace(/"/g, '""')}"`,
              classifySentiment(c),
              c.messageCount,
              new Date(c.created_at).toLocaleDateString(),
            ]);
            const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `contacts-${sentimentFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Exported", description: `${filtered.length} contacts exported` });
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Export
        </Button>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <div className="flex h-[calc(100vh-280px)] sm:h-[calc(100vh-200px)]">
          {/* Left: Contact List - hidden on mobile when a chat is selected */}
          <div className={`${isMobile ? (selectedId ? "hidden" : "w-full") : "w-[260px] lg:w-[340px] xl:w-[380px]"} border-r border-border/50 flex flex-col shrink-0`}>
            {/* Search */}
            <div className="p-3 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Contact List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No conversations yet</div>
              ) : (
                filtered.map(convo => (
                  <div
                    key={convo.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/30 hover:bg-secondary/50 transition-colors ${selectedId === convo.id ? "bg-secondary" : ""}`}
                    onClick={() => loadMessages(convo.id)}
                  >
                    <div className="rounded-full bg-muted p-2 shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold truncate">{displayName(convo)}</p>
                      </div>
                      {displayPhone(convo) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {displayPhone(convo)}
                        </p>
                      )}
                      {convo.tags.length > 0 ? (
                        <div className="mt-0.5">
                          <TagBadges tags={convo.tags} compact />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {convo.lastMessage ? convo.lastMessage.slice(0, 60) + (convo.lastMessage.length > 60 ? "..." : "") : "No messages"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                            title="Delete chat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete all messages for this contact. If they message again, they'll be treated as a new customer. Conversation counts for billing will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteConversation(convo.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Right: Chat Area - full width on mobile when selected */}
          <div className={`${isMobile ? (selectedId ? "w-full" : "hidden") : ""} flex-1 flex flex-col`}>
            {!selectedId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a chat from the list to view messages</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-3 sm:px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {isMobile && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedId(null)}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="rounded-full bg-muted p-2 shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedConvo ? displayName(selectedConvo) : ""}</p>
                      {selectedConvo && displayPhone(selectedConvo) && (
                        <p className="text-xs text-muted-foreground truncate">{displayPhone(selectedConvo)}</p>
                      )}
                    </div>
                  </div>
                  {selectedConvo && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TagBadges
                        tags={selectedConvo.tags}
                        onRemove={async (tagId) => {
                          // Optimistic update
                          setConversations(prev => prev.map(c => c.id === selectedConvo.id
                            ? { ...c, tags: c.tags.filter(t => t.tag_id !== tagId) }
                            : c
                          ));
                          await supabase.from("conversation_tags").delete()
                            .eq("conversation_id", selectedConvo.id)
                            .eq("tag_id", tagId);
                        }}
                      />
                      <ConversationTagSelector
                        conversationId={selectedConvo.id}
                        assignedTags={selectedConvo.tags}
                        onTagsChanged={loadConversations}
                      />
                      <Button
                        variant={selectedConvo.bot_paused ? "destructive" : "outline"}
                        size="sm"
                        className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm"
                        onClick={() => toggleBotPause(selectedConvo.id, selectedConvo.bot_paused)}
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{selectedConvo.bot_paused ? "Taken Over" : "Bot Active"}</span>
                        <span className="sm:hidden">{selectedConvo.bot_paused ? "Manual" : "Bot"}</span>
                      </Button>
                    </div>
                  )}
                </div>


                {/* Messages */}
                <ScrollArea className="flex-1 px-3 sm:px-4 py-4">
                  {loadingMessages ? (
                    <div className="text-center text-muted-foreground py-8">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No messages yet</div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(msg => {
                        const isVoice = msg.content.startsWith("🎤 Voice message: ") || msg.content.startsWith("🎤 [Voice message");
                        const voiceText = isVoice ? msg.content.replace(/^🎤 Voice message: /, "").replace(/^🎤 \[Voice message.*?\]/, "") : "";
                        return (
                          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                            <div
                              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2.5 text-sm whitespace-pre-wrap ${
                                msg.role === "user"
                                  ? "bg-muted text-foreground rounded-bl-sm"
                                  : "bg-primary text-primary-foreground rounded-br-sm"
                              }`}
                            >
                              {isVoice && msg.role === "user" ? (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Mic className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-xs font-medium text-primary">Voice Message</span>
                                  </div>
                                  <p>{voiceText || msg.content}</p>
                                </div>
                              ) : (
                                msg.content
                              )}
                              <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Bot paused banner */}
                {selectedConvo?.bot_paused && (
                  <div className="px-4 py-2 bg-destructive/10 text-sm text-destructive text-center border-t border-destructive/20">
                    Bot paused — you're in control
                  </div>
                )}

                {/* Reply Input */}
                <div className="px-3 sm:px-4 py-3 border-t border-border/50 flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendReply} disabled={sending || !replyText.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
