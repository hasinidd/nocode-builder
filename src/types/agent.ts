import { Tables } from "@/integrations/supabase/types";
import { Headphones, CalendarDays, ShoppingCart, MessageCircle, BarChart3 } from "lucide-react";
import React from "react";

export type Agent = Tables<"agents">;
export type Profile = Tables<"profiles">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;

export type AgentType = "support_bot" | "booking_agent" | "order_handler" | "general_chatbot" | "data_analyst" | "inquiry_only";
export type AgentStatus = "draft" | "active" | "paused";
export type AgentPersonality = "professional" | "friendly" | "casual";

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  support_bot: "Support Bot",
  booking_agent: "Booking Agent",
  order_handler: "Order Handler",
  general_chatbot: "General Chatbot",
  data_analyst: "Data Analyst",
  inquiry_only: "Inquiry Only",
};

export const AGENT_TYPE_ICONS: Record<AgentType, React.ReactNode> = {
  support_bot: React.createElement(Headphones, { className: "h-7 w-7 text-primary" }),
  booking_agent: React.createElement(CalendarDays, { className: "h-7 w-7 text-primary" }),
  order_handler: React.createElement(ShoppingCart, { className: "h-7 w-7 text-primary" }),
  general_chatbot: React.createElement(MessageCircle, { className: "h-7 w-7 text-primary" }),
  data_analyst: React.createElement(BarChart3, { className: "h-7 w-7 text-primary" }),
  inquiry_only: React.createElement(Headphones, { className: "h-7 w-7 text-primary" }),
};

export const PERSONALITY_LABELS: Record<AgentPersonality, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
};

export const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "auto", label: "Auto-detect (match user's language)" },
  { value: "English", label: "English" },
  { value: "Spanish", label: "Espanol (Spanish)" },
  { value: "French", label: "Francais (French)" },
  { value: "Arabic", label: "Arabic" },
  { value: "Portuguese", label: "Portugues (Portuguese)" },
  { value: "German", label: "Deutsch (German)" },
  { value: "Italian", label: "Italiano (Italian)" },
  { value: "Chinese", label: "Chinese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Hindi", label: "Hindi" },
  { value: "Russian", label: "Russian" },
  { value: "Turkish", label: "Turkce (Turkish)" },
  { value: "Dutch", label: "Nederlands (Dutch)" },
  { value: "Sinhala", label: "Sinhala" },
  { value: "Tamil", label: "Tamil" },
];
