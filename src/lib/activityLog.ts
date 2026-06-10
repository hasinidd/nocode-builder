import { supabase } from "@/integrations/supabase/client";

type LogAction =
  | "login"
  | "signup"
  | "logout"
  | "agent_created"
  | "agent_updated"
  | "agent_activated"
  | "agent_paused"
  | "agent_reconfigured"
  | "product_added"
  | "product_updated"
  | "product_deleted"
  | "service_added"
  | "service_updated"
  | "service_deleted"
  | "faq_added"
  | "faq_updated"
  | "faq_deleted"
  | "order_status_changed"
  | "booking_status_changed"
  | "inquiry_status_changed"
  | "whatsapp_connected"
  | "whatsapp_disconnected"
  | "stripe_connected"
  | "stripe_disconnected"
  | "shopify_connected"
  | "google_calendar_connected"
  | "subscription_changed"
  | "profile_updated"
  | "availability_updated"
  | "welcome_sequence_updated"
  | "document_template_created"
  | "document_template_updated"
  | "collect_fields_updated"
  | "payment_methods_updated"
  | "followup_rules_updated"
  | "page_visited"
  | string;

interface LogParams {
  action: LogAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function logActivity({ action, entityType, entityId, metadata }: LogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs" as any).insert({
      user_id: user.id,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || {},
    } as any);
  } catch (e) {
    // Silent fail - logging should never break the app
    console.debug("Activity log failed:", e);
  }
}
