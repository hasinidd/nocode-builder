import { Fragment, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { CheckCircle2, SkipForward, Pencil } from "lucide-react";

interface Props {
  content: string;
  onAction?: (text: string) => void;
  isLatest?: boolean;
}

interface ParsedSegment {
  type: "text" | "buttons" | "summary" | "step";
  content: string;
  options?: string[];
  label?: string;
}

/** Strip leading emojis from button text */
function stripEmojis(text: string): string {
  return text.replace(/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u20E3\u{E0020}-\u{E007F}]+\s*/gu, "").trim();
}

/** Remove all marker syntax and config data that might leak through */
function sanitizeText(text: string): string {
  return text
    .replace(/\[\/STEP\]/g, "")
    .replace(/\[STEP:[^\]]*\]/g, "")
    .replace(/\[SUMMARY\][\s\S]*?\[\/SUMMARY\]/g, "")
    .replace(/\[BUTTONS:\s*[\s\S]*?\]/g, "")
    .replace(/\[CONFIG_READY\]/g, "")
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/\[(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\][\s\S]*?\[\/(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\]/g, "")
    .replace(/\[(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\]\s*\{[^}]*\}/g, "")
    .replace(/\[\/?(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\]/g, "")
    .replace(/^\s*\{[\s\S]*?\}\s*$/gm, "")
    .replace(/^\s*\*{0,2}(?:Agent\s*Name|Type|Agent\s*Type|Tone|Personality|Purpose|Language|Welcome\s*Message|Currency|Status|Business\s*Hours|Contact\s*Info|Services|Products|FAQs|Rules)\s*:?\*{0,2}.*$/gim, "")
    .replace(/^\s*.+\((?:[^\n)]*(?:min|LKR|USD|EUR|GBP|\$|€|£)[^\n)]*)\)\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseInteractiveContent(raw: string): ParsedSegment[] {
  if (!raw?.trim()) return [];

  const segments: ParsedSegment[] = [];
  const markerRegex = /\[SUMMARY\][\s\S]*?\[\/SUMMARY\]|\[BUTTONS:\s*[\s\S]*?\]|\[STEP:[^\]]*\][\s\S]*?(?:\[\/STEP\]|(?=\[BUTTONS:|\[SUMMARY\]|\[STEP:|$))/g;

  let lastIndex = 0;

  for (const match of raw.matchAll(markerRegex)) {
    const token = match[0];
    const index = match.index ?? 0;

    const before = sanitizeText(raw.slice(lastIndex, index));
    if (before) segments.push({ type: "text", content: before });

    if (token.startsWith("[BUTTONS:")) {
      const buttonMatch = token.match(/^\[BUTTONS:\s*([\s\S]*?)\]$/);
      if (buttonMatch) {
        const options = buttonMatch[1].split("|").map((o) => stripEmojis(o.trim())).filter(Boolean);
        if (options.length > 0) segments.push({ type: "buttons", content: "", options });
      }
    } else if (token.startsWith("[SUMMARY]")) {
      const summaryMatch = token.match(/^\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]$/);
      if (summaryMatch) {
        segments.push({ type: "summary", content: summaryMatch[1].trim() });
      }
    } else if (token.startsWith("[STEP:")) {
      const stepMatch = token.match(/^\[STEP:\s*([^\]]*?)\]\s*([\s\S]*?)(?:\[\/STEP\])?$/);
      if (stepMatch) {
        // Don't create a step segment — just treat content as plain text (no label shown)
        const stepContent = sanitizeText(stepMatch[2].trim());
        if (stepContent) segments.push({ type: "text", content: stepContent });
      }
    }

    lastIndex = index + token.length;
  }

  const tail = sanitizeText(raw.slice(lastIndex));
  if (tail) segments.push({ type: "text", content: tail });

  return segments;
}

const InteractiveChatMessage = forwardRef<HTMLDivElement, Props>(function InteractiveChatMessage(
  { content, onAction, isLatest },
  ref,
) {
  const segments = parseInteractiveContent(content);

  if (segments.length === 0) {
    return (
      <div ref={ref} className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-2.5">
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.type === "text" && (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{seg.content}</ReactMarkdown>
            </div>
          )}

          {seg.type === "buttons" && isLatest && onAction && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-wrap gap-1.5 pt-1"
            >
              {seg.options?.map((opt, j) => {
                const isSkip = /skip/i.test(opt);
                const isConfirm = /confirm|yes|done|looks good/i.test(opt);
                const isEdit = /edit|change|modify/i.test(opt);

                return (
                  <Button
                    key={j}
                    variant={isConfirm ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-7 px-3 rounded-full transition-transform duration-150 hover:scale-110 ${
                      isConfirm
                        ? "bg-primary hover:bg-primary gap-1.5"
                        : isSkip
                          ? "text-muted-foreground gap-1.5"
                          : isEdit
                            ? "border-primary/30 text-primary gap-1.5"
                            : "gap-1.5 bg-background hover:bg-background hover:text-foreground"
                    }`}
                    onClick={() => onAction(opt)}
                  >
                    {isConfirm && <CheckCircle2 className="h-3 w-3" />}
                    {isSkip && <SkipForward className="h-3 w-3" />}
                    {isEdit && <Pencil className="h-3 w-3" />}
                    {opt}
                  </Button>
                );
              })}
            </motion.div>
          )}

          {/* Summary blocks are only shown in the phone preview, not in chat */}
        </Fragment>
      ))}
    </div>
  );
});

export default InteractiveChatMessage;
