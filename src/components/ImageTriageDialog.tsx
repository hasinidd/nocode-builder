import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Wrench, MessageSquare, HelpCircle, ScanText, Send, ChevronLeft, Plus, Loader2,
} from "lucide-react";

export type TriageAction =
  | { kind: "attach_to_product"; productId: string; productName: string; imageUrl: string; imageName: string }
  | { kind: "create_product_from_image"; imageUrl: string; imageName: string }
  | { kind: "attach_to_service"; serviceId: string; serviceName: string; imageUrl: string; imageName: string }
  | { kind: "create_service_from_image"; imageUrl: string; imageName: string }
  | { kind: "add_to_welcome"; imageUrl: string; imageName: string }
  | { kind: "attach_to_faq"; faqId: string; faqQuestion: string; imageUrl: string; imageName: string }
  | { kind: "create_faq_from_image"; imageUrl: string; imageName: string }
  | { kind: "extract_data"; imageUrl: string; imageName: string }
  | { kind: "send_as_message"; imageUrl: string; imageName: string };

interface Props {
  open: boolean;
  agentId: string;
  imageUrl: string;
  imageName: string;
  onClose: () => void;
  onChoose: (action: TriageAction) => void;
}

type Step = "main" | "pick-product" | "pick-service" | "pick-faq";

interface CatalogItem { id: string; name: string }
interface FaqItem { id: string; question: string }

const OPTIONS = [
  { key: "product", icon: Package, title: "Product image", desc: "Attach to an existing product or create a new one", color: "text-emerald-500" },
  { key: "service", icon: Wrench, title: "Service image", desc: "Attach to an existing service or create a new one", color: "text-blue-500" },
  { key: "welcome", icon: MessageSquare, title: "Welcome sequence", desc: "Add as an image step to the welcome flow", color: "text-amber-500" },
  { key: "faq", icon: HelpCircle, title: "FAQ media", desc: "Attach to an existing FAQ or create a new one", color: "text-purple-500" },
  { key: "extract", icon: ScanText, title: "Extract data", desc: "Read the image and draft a product / service from it", color: "text-rose-500" },
  { key: "send", icon: Send, title: "Just send to chat", desc: "Send the image to the assistant without further action", color: "text-muted-foreground" },
] as const;

export default function ImageTriageDialog({ open, agentId, imageUrl, imageName, onClose, onChoose }: Props) {
  const [step, setStep] = useState<Step>("main");
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setStep("main");
  }, [open]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("id, name").eq("agent_id", agentId).order("name");
    setProducts(data || []);
    setLoading(false);
  };
  const loadServices = async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("id, name").eq("agent_id", agentId).order("name");
    setServices(data || []);
    setLoading(false);
  };
  const loadFaqs = async () => {
    setLoading(true);
    const { data } = await supabase.from("faqs").select("id, question").eq("agent_id", agentId).order("sort_order");
    setFaqs(data || []);
    setLoading(false);
  };

  const handleMainSelect = (key: typeof OPTIONS[number]["key"]) => {
    if (key === "product") { setStep("pick-product"); loadProducts(); return; }
    if (key === "service") { setStep("pick-service"); loadServices(); return; }
    if (key === "faq") { setStep("pick-faq"); loadFaqs(); return; }
    if (key === "welcome") { onChoose({ kind: "add_to_welcome", imageUrl, imageName }); return; }
    if (key === "extract") { onChoose({ kind: "extract_data", imageUrl, imageName }); return; }
    if (key === "send") { onChoose({ kind: "send_as_message", imageUrl, imageName }); return; }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "main" && (
              <button onClick={() => setStep("main")} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            What should I do with this image?
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 pt-2">
            <img src={imageUrl} alt={imageName} className="w-12 h-12 rounded-md object-cover border border-border/50" />
            <span className="truncate text-xs">{imageName}</span>
          </DialogDescription>
        </DialogHeader>

        {step === "main" && (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <Card
                  key={opt.key}
                  onClick={() => handleMainSelect(opt.key)}
                  className="p-3 cursor-pointer hover:border-primary/50 transition-colors flex items-start gap-3"
                >
                  <div className="rounded-md bg-secondary p-2 shrink-0">
                    <Icon className={`h-4 w-4 ${opt.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {step === "pick-product" && (
          <PickList
            loading={loading}
            items={products}
            emptyLabel="No products yet"
            createLabel="Create new product from this image"
            onCreate={() => onChoose({ kind: "create_product_from_image", imageUrl, imageName })}
            onPick={(it) => onChoose({ kind: "attach_to_product", productId: it.id, productName: it.name, imageUrl, imageName })}
            renderLabel={(it) => it.name}
          />
        )}

        {step === "pick-service" && (
          <PickList
            loading={loading}
            items={services}
            emptyLabel="No services yet"
            createLabel="Create new service from this image"
            onCreate={() => onChoose({ kind: "create_service_from_image", imageUrl, imageName })}
            onPick={(it) => onChoose({ kind: "attach_to_service", serviceId: it.id, serviceName: it.name, imageUrl, imageName })}
            renderLabel={(it) => it.name}
          />
        )}

        {step === "pick-faq" && (
          <PickList
            loading={loading}
            items={faqs}
            emptyLabel="No FAQs yet"
            createLabel="Create new FAQ with this image"
            onCreate={() => onChoose({ kind: "create_faq_from_image", imageUrl, imageName })}
            onPick={(it: any) => onChoose({ kind: "attach_to_faq", faqId: it.id, faqQuestion: it.question, imageUrl, imageName })}
            renderLabel={(it: any) => it.question}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickList<T extends { id: string }>({
  loading, items, emptyLabel, createLabel, onCreate, onPick, renderLabel,
}: {
  loading: boolean;
  items: T[];
  emptyLabel: string;
  createLabel: string;
  onCreate: () => void;
  onPick: (item: T) => void;
  renderLabel: (item: T) => string;
}) {
  return (
    <div className="space-y-2 mt-2">
      <Button onClick={onCreate} variant="outline" className="w-full justify-start gap-2">
        <Plus className="h-4 w-4" />
        {createLabel}
      </Button>
      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">{emptyLabel}</p>
        ) : (
          items.map(it => (
            <button
              key={it.id}
              onClick={() => onPick(it)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary transition-colors text-sm"
            >
              {renderLabel(it)}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
