import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, buildUserMessage, sendChatCollect, ActionResult } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, User, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import VoiceButton from "@/components/VoiceButton";
import VoiceModeToggle from "@/components/VoiceModeToggle";
import VoiceCallModal from "@/components/VoiceCallModal";
import ReactMarkdown from "react-markdown";
import DocumentLink from "@/components/DocumentLink";
import WelcomeSequenceDisplay from "@/components/WelcomeSequenceDisplay";
import ChatImageUpload from "@/components/ChatImageUpload";

interface WelcomeItemData {
  item_type: "text" | "image" | "video" | "audio" | "file";
  content: string | null;
  media_url: string | null;
  file_name: string | null;
  sort_order: number;
}

type Msg = {
  role: "user" | "assistant";
  content: any;
  sequenceItems?: WelcomeItemData[];
};

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

export default function ChatWidget({ agentId, welcomeMessage, authToken }: { agentId: string; welcomeMessage?: string; authToken?: string }) {
  const [welcomeItems, setWelcomeItems] = useState<WelcomeItemData[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  // Welcome message/sequence is only shown after the user sends their first message
  const [hasUserSent, setHasUserSent] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const sendVoiceRef = useRef<(text: string) => void>(() => {});
  const { isRecording, isTranscribing, toggleRecording } = useVoiceInput({
    onTranscript: (text) => sendVoiceRef.current(text),
    disabled: isLoading,
  });
  const { voiceMode, toggleVoiceMode, speak, isSpeaking, stopSpeaking } = useTextToSpeech();
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  const voiceCallSend = async (text: string): Promise<string> => {
    const voiceHint = { role: "system" as const, content: "The user is on a voice call. Keep your replies very short and conversational — 1-2 sentences max. No markdown, no lists, no formatting. Speak naturally as if on a phone call." };
    const userMsg = { role: "user" as const, content: text };
    const apiMsgs = [...messages, voiceHint, userMsg];
    const { text: reply, actionResults } = await sendChatCollect({ messages: apiMsgs, agentId, authToken });
    let cleaned = reply;
    const docLinks = actionResults.filter(r => r.documentLink).map(r => `[${r.documentLink!.label}](${r.documentLink!.url})`);
    if (docLinks.length > 0) cleaned += "\n\n" + docLinks.join("\n");
    actionResults.forEach(r => toast({ title: r.success ? "Success" : "Error", description: r.message }));
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: cleaned }]);
    return cleaned;
  };

  const voiceCall = useVoiceCall({ onSendMessage: voiceCallSend });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, welcomeItems]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadWelcomeItems();
  }, [agentId]);

  // Reactively update welcome message when prop changes (live sync from configurator)
  // Skip the initial render — only react to actual changes after mount
  const prevWelcomeMsg = useRef(welcomeMessage);
  useEffect(() => {
    if (prevWelcomeMsg.current === welcomeMessage) return;
    prevWelcomeMsg.current = welcomeMessage;
    if (!welcomeMessage) return;

    // Don't push welcome message until the user has sent their first message
    if (!hasUserSent) return;

    // Update the first assistant message if exists, or add one (only if no welcome items)
    if (welcomeItems.length > 0) return;
    setMessages(prev => {
      if (prev.length > 0 && prev[0].role === "assistant") {
        return [{ ...prev[0], content: welcomeMessage }, ...prev.slice(1)];
      }
      return [{ role: "assistant", content: welcomeMessage }];
    });
  }, [welcomeMessage, welcomeItems.length, hasUserSent]);

  const loadWelcomeItems = async () => {
    const { data } = await supabase
      .from("welcome_items")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order", { ascending: true });

    if (data && data.length > 0) {
      setWelcomeItems(data.map(d => ({
        ...d,
        item_type: d.item_type as WelcomeItemData["item_type"],
      })));
    }
    // Note: do NOT pre-populate messages with welcomeMessage here.
    // It will be shown only after the user sends their first message.
  };

  const send = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if ((!text && pendingImages.length === 0) || isLoading) return;
    const userMsg = buildUserMessage(text, pendingImages);

    // On the user's first message, prepend the welcome message (if any) so it appears
    // above their message — but never sent automatically before the user types.
    let baseMessages = messages;
    if (!hasUserSent) {
      setHasUserSent(true);
      if (welcomeItems.length === 0 && welcomeMessage && !messages.some(m => m.role === "assistant")) {
        baseMessages = [{ role: "assistant", content: welcomeMessage }, ...messages];
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
      messages: newMessages,
      agentId,
      authToken,
      onDelta: upsert,
      onActionResults: (results: ActionResult[]) => {
        results.forEach(r => toast({ title: r.success ? "Success" : "Error", description: r.message }));
        const docLinks = results.filter(r => r.documentLink).map(r => `[${r.documentLink!.label}](${r.documentLink!.url})`);
        if (docLinks.length > 0) {
          assistantSoFar += "\n\n" + docLinks.join("\n");
        }
      },
      onSequenceItems: (items) => {
        // Attach FAQ sequence items to the current assistant message so they render
        // inline as the reply (not in the welcome area at the top of the chat).
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

  return (
    <>
    <Card className="glass border-border/50 card-shadow flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex justify-end gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => { setShowVoiceCall(true); voiceCall.startCall(); }}
          title="Voice Call"
        >
          <Phone className="h-3.5 w-3.5 text-primary" />
        </Button>
        <VoiceModeToggle voiceMode={voiceMode} onToggle={toggleVoiceMode} isSpeaking={isSpeaking} />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasUserSent && <WelcomeSequenceDisplay items={welcomeItems} />}

        {messages.map((msg, i) => {
          const text = getDisplayText(msg.content);
          const seq = msg.sequenceItems || [];
          const hasText = !!text;
          const hasSeq = seq.length > 0;
          if (msg.role === "assistant" && !hasText && !hasSeq) return null;
          return (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && !hasSeq && (
                <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={`flex flex-col gap-2 ${msg.role === "user" ? "" : "flex-1"} ${hasSeq ? "" : "max-w-[80%]"}`}>
                {msg.role === "assistant" && hasSeq && (
                  <WelcomeSequenceDisplay items={seq} />
                )}
                {(msg.role === "user" || hasText) && (
                  <div className={`rounded-xl px-3 py-2 text-sm max-w-[80%] ${
                    msg.role === "user" ? "bg-primary text-primary-foreground self-end" : "bg-secondary self-start ml-11"
                  }`}>
                    {msg.role === "user" && getImageUrls(msg.content).length > 0 && (
                      <div className="flex gap-1 mb-1.5 flex-wrap">
                        {getImageUrls(msg.content).map((url, j) => (
                          <img key={j} src={url} alt="" className="w-16 h-16 rounded-md object-cover" />
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
                    ) : text ? text : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-secondary rounded-xl px-3 py-2 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="border-t border-border/50 p-3">
        {pendingImages.length > 0 && (
          <div className="mb-2">
            <ChatImageUpload agentId={agentId} pendingImages={pendingImages} onImagesChange={setPendingImages} disabled={isLoading} />
          </div>
        )}
        <div className="flex gap-2 items-center">
          {pendingImages.length === 0 && (
            <ChatImageUpload agentId={agentId} pendingImages={pendingImages} onImagesChange={setPendingImages} disabled={isLoading} />
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
    </Card>

    <VoiceCallModal
      open={showVoiceCall}
      onClose={() => setShowVoiceCall(false)}
      agentName="Assistant"
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
