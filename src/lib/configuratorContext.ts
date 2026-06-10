import type { AgentType } from "@/types/agent";

export type ConfiguratorMessage = {
  role: "user" | "assistant";
  content: string;
  rawContent?: string;
  attachments?: { type: "image" | "file"; url: string; name: string }[];
};

interface SeedMessageParams {
  initialName: string;
  initialType: AgentType;
  initialDescription: string;
  scrapedContent?: string;
  scrapedTitle?: string;
  uploadedDocContent?: string;
  uploadedDocName?: string;
}

function isChatExportText(content: string): boolean {
  return /\[\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}[,\s]+\d{1,2}:\d{2}/.test(content)
    || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}/m.test(content)
    || /\d{1,2}:\d{2}\s*[AP]M\s*-\s*.+:/i.test(content);
}

export function buildConfiguratorSeedMessage({
  initialName,
  initialType,
  initialDescription,
  scrapedContent,
  scrapedTitle,
  uploadedDocContent,
  uploadedDocName,
}: SeedMessageParams): string {
  let startMsg = `The user wants to create an agent called "${initialName}" of type "${initialType}". ABSOLUTE RULE: The agent type is LOCKED to "${initialType}" — you must NEVER change it, suggest changing it, or use the wrong item type. ${initialType === "order_handler" ? "This is a PRODUCT-based business. Use ADD_PRODUCT only. NEVER say 'service' or use ADD_SERVICE." : initialType === "booking_agent" ? "This is a SERVICE-based business. Use ADD_SERVICE only. NEVER say 'product' or use ADD_PRODUCT." : initialType === "inquiry_only" ? "This is an inquiry/FAQ-only bot. Do NOT add products or services." : ""} They described it as: "${initialDescription || "No description provided yet"}". Remember: EVERY message you send must end with a question.`;

  if (scrapedContent) {
    startMsg += `\n\nThe user also provided their website (${scrapedTitle || "their business site"}) and we scraped the following content from it. Use this information on EVERY turn while configuring the bot. Prioritize extracting products or services, prices, categories, business hours, contact details, FAQs, delivery or booking rules, and any other business information:\n\n---SCRAPED WEBSITE CONTENT---\n${scrapedContent.slice(0, 24000)}\n---END SCRAPED CONTENT---`;
  }

  if (uploadedDocContent) {
    if (isChatExportText(uploadedDocContent)) {
      startMsg += `\n\nThe user uploaded an EXPORTED CHAT LOG (${uploadedDocName || "chat export"}). This contains real customer conversations. Your PRIMARY task is to analyze these conversations and extract FAQs from recurring questions and their best answers. Also extract any products, services, pricing, business details, policies, or contact info mentioned. Keep using this source during the full setup flow:\n\n---EXPORTED CHAT CONTENT---\n${uploadedDocContent.slice(0, 24000)}\n---END CHAT CONTENT---`;
    } else {
      startMsg += `\n\nThe user also uploaded a document (${uploadedDocName || "document"}) with the following extracted content. Use this on EVERY turn to pre-fill configuration, especially products or services, pricing, business hours, contact details, FAQs, and policies:\n\n---UPLOADED DOCUMENT CONTENT---\n${uploadedDocContent.slice(0, 24000)}\n---END DOCUMENT CONTENT---`;
    }
  }

  if (scrapedContent || uploadedDocContent) {
    startMsg += "\n\nStart by showing a concise summary of what you found, with special attention to products or services and business information. Then ask if they want to adjust or add anything.";
  } else {
    startMsg += " Start by acknowledging what they want and ask your first follow-up question to understand their needs better.";
  }

  return startMsg;
}

export function buildConfiguratorConversation(messages: ConfiguratorMessage[], seedMessage: string) {
  const mappedMessages = messages.map((message) => ({
    role: message.role,
    content: message.role === "user" ? message.rawContent || message.content : message.content,
  }));

  return seedMessage
    ? [{ role: "user" as const, content: seedMessage }, ...mappedMessages]
    : mappedMessages;
}

export function buildImportedWebsiteMessage(url: string, title: string | undefined, markdown: string): string {
  return `I'm sharing content from a website: "${title || url}". Here is the extracted content:\n\n---WEBSITE CONTENT---\n${markdown.slice(0, 24000)}\n---END WEBSITE CONTENT---\n\nPlease analyze this thoroughly. Prioritize extracting every product or service, prices, categories, business hours, contact details, delivery or booking policies, FAQs, and any other business information. Then continue configuring the bot with that data and use action markers to add products or services when appropriate.`;
}