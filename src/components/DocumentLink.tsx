import { useState } from "react";
import { Download, FileText, Loader2, ExternalLink } from "lucide-react";
import { downloadHtmlAsPdf } from "@/lib/pdfDownload";
import { toast } from "@/hooks/use-toast";

interface DocumentLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function DocumentLink({ href, children }: DocumentLinkProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePdfDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDownloading(true);
    try {
      const docName = typeof children === "string" ? children.replace(/[^a-zA-Z0-9-_]/g, "_") : "document";
      await downloadHtmlAsPdf(href, `${docName}.pdf`);
      toast({ title: "✅ PDF downloaded!" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <span className="flex items-center gap-1.5 mt-2 flex-wrap">
      <button
        onClick={handlePdfDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        {isDownloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {isDownloading ? "Generating PDF…" : "Download PDF"}
      </button>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground text-xs hover:text-primary transition-colors"
      >
        <ExternalLink className="h-3 w-3" /> Preview
      </a>
    </span>
  );
}
