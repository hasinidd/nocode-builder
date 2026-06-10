import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, buildUserMessage, sendChatCollect, ActionResult } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Phone, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import VoiceButton from "@/components/VoiceButton";
import VoiceModeToggle from "@/components/VoiceModeToggle";
import VoiceCallModal from "@/components/VoiceCallModal";
import ReactMarkdown from "react-markdown";
import DocumentLink from "@/components/DocumentLink";
import { motion } from "framer-motion";
import WelcomeSequenceDisplay from "@/components/WelcomeSequenceDisplay";
import ChatImageUpload from "@/components/ChatImageUpload";

interface WelcomeItemData {
  item_type: "text" | "image" | "video" | "audio" | "file";
  content: string | null;
  media_url: string | null;
  file_name: string | null;
  sort_order: number;
}

type Msg = { role: "user" | "assistant"; content: any; sequenceItems?: WelcomeItemData[] };

function getDisplayText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textPart = content.find((p: any) => p.type === "text");
    return textPart?.text || "";
  }
  return "";
}

function getImageUrls(content: any): string[] {
  if (!Array.isArray(content)) return [];
  return content.filter((p: any) => p.type === "image_url").map((p: any) => p.image_url.url);
}

export default function AgentChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [agent, setAgent] = useState<any>(null);
  const [welcomeItems, setWelcomeItems] = useState<WelcomeItemData[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  // Welcome message/sequence is only shown after the user sends their first message
  const [hasUserSent, setHasUserSent] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendVoiceRef = useRef<(text: string) => void>(() => {});
  const { isRecording, isTranscribing, toggleRecording } = useVoiceInput({
    onTranscript: (text) => sendVoiceRef.current(text),
    disabled: isLoading,
  });
  const { voiceMode, toggleVoiceMode, speak, isSpeaking, stopSpeaking } = useTextToSpeech();
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  const voiceCallSend = async (text: string): Promise<string> => {
    if (!id) throw new Error("No agent");
    const voiceHint = { role: "system" as const, content: "The user is on a voice call. Keep your replies very short and conversational — 1-2 sentences max. No markdown, no lists, no formatting. Speak naturally as if on a phone call." };
    const userMsg = { role: "user" as const, content: text };
    const apiMsgs = [...messages, voiceHint, userMsg];
    const { text: reply, actionResults } = await sendChatCollect({ messages: apiMsgs, agentId: id });
    let cleaned = reply;
    const docLinks = actionResults.filter(r => r.documentLink).map(r => `[${r.documentLink!.label}](${r.documentLink!.url})`);
    if (docLinks.length > 0) cleaned += "\n\n" + docLinks.join("\n");
    actionResults.forEach(r => toast({ title: r.success ? "Success" : "Error", description: r.message }));
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: cleaned }]);
    return cleaned;
  };

  const voiceCall = useVoiceCall({ onSendMessage: voiceCallSend });

  useEffect(() => {
    if (id) loadAgent(id);
  }, [id]);

  // Auto-start voice call when ?voice=true is in URL
  useEffect(() => {
    if (agent && searchParams.get("voice") === "true" && !showVoiceCall) {
      setShowVoiceCall(true);
      voiceCall.startCall();
    }
  }, [agent, searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, welcomeItems]);

  const loadAgent = async (agentId: string) => {
    const [agentRes, itemsRes] = await Promise.all([
      supabase.from("agents_public").select("id, user_id, agent_type, personality, status, created_at, updated_at, name, welcome_message, avatar_url, default_language, default_currency").eq("id", agentId).single(),
      supabase.from("welcome_items").select("*").eq("agent_id", agentId).order("sort_order", { ascending: true }),
    ]);

    if (agentRes.data) {
      setAgent(agentRes.data);
      // Note: do NOT pre-populate messages with welcome_message here.
      // It will be shown only after the user sends their first message.
    }

    if (itemsRes.data && itemsRes.data.length > 0) {
      setWelcomeItems(itemsRes.data.map(d => ({
        ...d,
        item_type: d.item_type as WelcomeItemData["item_type"],
      })));
    }
  };

  const send = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if ((!text && pendingImages.length === 0) || isLoading || !id) return;
    const userMsg = buildUserMessage(text, pendingImages);

    // On the user's first message, prepend the welcome message (if any) so it appears
    // above their message — never sent automatically before the user types.
    let baseMessages = messages;
    if (!hasUserSent) {
      setHasUserSent(true);
      if (welcomeItems.length === 0 && agent?.welcome_message && !messages.some(m => m.role === "assistant")) {
        baseMessages = [{ role: "assistant", content: agent.welcome_message }, ...messages];
      }
    }

    const newMessages = [...baseMessages, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setPendingImages([]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > newMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: newMessages.filter(m => getDisplayText(m.content) !== agent?.welcome_message || m.role !== "assistant"),
      agentId: id,
      onDelta: upsert,
      onActionResults: (results: ActionResult[]) => {
        results.forEach(r => toast({ title: r.success ? "Success" : "Error", description: r.message }));
        const docLinks = results.filter(r => r.documentLink).map(r => `[${r.documentLink!.label}](${r.documentLink!.url})`);
        if (docLinks.length > 0) {
          assistantSoFar += "\n\n" + docLinks.join("\n");
        }
      },
      onSequenceItems: (items) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const mapped: WelcomeItemData[] = items.map((it: any, idx: number) => ({
            item_type: it.item_type,
            content: it.content,
            media_url: it.media_url,
            file_name: it.file_name,
            sort_order: typeof it.sort_order === "number" ? it.sort_order : idx,
          }));
          if (last?.role === "assistant" && prev.length > newMessages.length) {
            const merged = [...(last.sequenceItems || []), ...mapped];
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, sequenceItems: merged } : m));
          }
          return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantSoFar, sequenceItems: mapped }];
        });
      },
      onDone: () => {
        if (voiceMode) speak(assistantSoFar);
        setIsLoading(false);
      },
      onError: (err) => {
        setIsLoading(false);
        toast({ title: "Error", description: err, variant: "destructive" });
      },
    });
  };

  sendVoiceRef.current = (text: string) => send(text);

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading agent...</p>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 glass px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard")} title="Back to Dashboard">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="rounded-full bg-primary/20 p-2">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="font-display font-semibold">{agent.name}</h1>
          <p className="text-xs text-muted-foreground">Powered by BuildStart</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={() => { setShowVoiceCall(true); voiceCall.startCall(); }}
            title="Voice Call"
          >
            <Phone className="h-4 w-4 text-primary" />
          </Button>
          <VoiceModeToggle voiceMode={voiceMode} onToggle={toggleVoiceMode} isSpeaking={isSpeaking} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {hasUserSent && <WelcomeSequenceDisplay items={welcomeItems} />}

        {messages.map((msg, i) => {
          const text = getDisplayText(msg.content);
          const seq = msg.sequenceItems || [];
          const hasText = !!text;
          const hasSeq = seq.length > 0;
          if (msg.role === "assistant" && !hasText && !hasSeq) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && !hasSeq && (
                <div className="rounded-full bg-primary/20 p-2 h-8 w-8 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`flex flex-col gap-2 ${msg.role === "user" ? "" : "flex-1"}`}>
                {msg.role === "assistant" && hasSeq && (
                  <WelcomeSequenceDisplay items={seq} />
                )}
                {(msg.role === "user" || hasText) && (
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground self-end"
                        : "glass border-border/50 self-start ml-11"
                    }`}
                  >
                    {/* Show attached images */}
                    {msg.role === "user" && getImageUrls(msg.content).length > 0 && (
                      <div className="flex gap-1.5 mb-2 flex-wrap">
                        {getImageUrls(msg.content).map((url, j) => (
                          <img key={j} src={url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              const isDocLink = href && (href.includes("/documents/") || href.includes(".html"));
                              if (isDocLink) {
                                return <DocumentLink href={href}>{children}</DocumentLink>;
                              }
                              return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                            },
                          }}
                        >
                          {text}
                        </ReactMarkdown>
                      </div>
                    ) : text ? (
                      <p className="text-sm">{text}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/20 p-2 h-8 w-8 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="glass border-border/50 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="border-t border-border/50 glass px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {pendingImages.length > 0 && (
            <div className="mb-2">
              <ChatImageUpload agentId={id!} pendingImages={pendingImages} onImagesChange={setPendingImages} disabled={isLoading} />
            </div>
          )}
          <div className="flex gap-2 items-center">
            {pendingImages.length === 0 && (
              <ChatImageUpload agentId={id!} pendingImages={pendingImages} onImagesChange={setPendingImages} disabled={isLoading} />
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={pendingImages.length > 0 ? "Add a message or send image..." : "Type a message..."}
              disabled={isLoading}
              className="flex-1"
            />
            <VoiceButton isRecording={isRecording} isTranscribing={isTranscribing} onClick={toggleRecording} disabled={isLoading} />
            <Button onClick={() => send()} disabled={isLoading || (!input.trim() && pendingImages.length === 0)} className="bg-primary hover:bg-primary/90" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <VoiceCallModal
      open={showVoiceCall}
      onClose={() => setShowVoiceCall(false)}
      agentName={agent.name}
      agentAvatarUrl={agent.avatar_url}
      isListening={voiceCall.isListening}
      isSpeaking={voiceCall.isSpeaking}
      isProcessing={voiceCall.isProcessing}
      captions={voiceCall.captions}
      callDuration={voiceCall.callDuration}
      onEndCall={voiceCall.endCall}
      onToggleMute={voiceCall.toggleMute}
    />
    </>
  );
}
