import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

type ItemType = "text" | "image" | "video" | "audio" | "file";

interface WelcomeItemData {
  item_type: ItemType;
  content: string | null;
  media_url: string | null;
  file_name: string | null;
  sort_order: number;
}

interface Props {
  items: WelcomeItemData[];
}

export default function WelcomeSequenceDisplay({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <>
      {items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.3 }}
            className="flex gap-3"
          >
            <div className="rounded-full bg-primary/20 p-2 h-8 w-8 flex items-center justify-center shrink-0 mt-1">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="glass border-border/50 rounded-2xl px-4 py-3 max-w-[80%] space-y-2">
              {/* Text content */}
              {item.content && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                </div>
              )}

              {/* Media rendering */}
              {item.media_url && item.item_type === "image" && (
                <img
                  src={item.media_url}
                  alt={item.file_name || "Welcome image"}
                  className="rounded-lg max-w-full max-h-64 object-cover"
                />
              )}

              {item.media_url && item.item_type === "video" && (
                <video
                  src={item.media_url}
                  controls
                  className="rounded-lg max-w-full max-h-64"
                />
              )}

              {item.media_url && item.item_type === "audio" && (
                <audio src={item.media_url} controls className="w-full" />
              )}

              {item.media_url && item.item_type === "file" && (
                <a
                  href={item.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80 transition-colors"
                >
                  📎 {item.file_name || "Download file"}
                </a>
              )}
            </div>
          </motion.div>
        ))}
    </>
  );
}
