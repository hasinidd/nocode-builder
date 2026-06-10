import { supabase } from "@/integrations/supabase/client";

export interface ScrapeResult {
  success: boolean;
  error?: string;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke("firecrawl-scrape", {
    body: {
      url,
      options: {
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 90000,
        waitFor: 3000,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return normalizeScrapeResponse(data);
}

function normalizeScrapeResponse(raw: any): ScrapeResult {
  if (!raw) {
    return { success: false, error: "No response data from scraper." };
  }

  if (raw.success === false) {
    return { success: false, error: raw.error || "Failed to scrape website." };
  }

  const markdown = raw?.data?.markdown || raw?.markdown;
  const metadata = raw?.data?.metadata || raw?.metadata;

  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    return {
      success: false,
      error: raw?.error || "No readable content could be extracted from this website.",
    };
  }

  return {
    success: true,
    data: {
      markdown,
      metadata,
    },
  };
}
