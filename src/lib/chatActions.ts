import { supabase } from "@/integrations/supabase/client";

interface BookingAction {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderAction {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  payment_method: string;
  items: OrderItem[];
  notes: string;
}

export function stripActionMarkers(text: string): string {
  return text
    .replace(/\[BOOK_APPOINTMENT\][\s\S]*?\[\/BOOK_APPOINTMENT\]/g, "")
    .replace(/\[CREATE_ORDER\][\s\S]*?\[\/CREATE_ORDER\]/g, "")
    .replace(/\[GENERATE_DOCUMENT\][\s\S]*?\[\/GENERATE_DOCUMENT\]/g, "")
    .replace(/\[COLLECT_INFO\][\s\S]*?\[\/COLLECT_INFO\]/g, "")
    .trim();
}

export interface ActionResults {
  messages: string[];
  documentLinks: { label: string; url: string }[];
}

export async function processActions(fullText: string, agentId: string, conversationId?: string): Promise<ActionResults> {
  const results: ActionResults = { messages: [], documentLinks: [] };

  // Process booking actions
  const bookingMatches = fullText.matchAll(/\[BOOK_APPOINTMENT\]([\s\S]*?)\[\/BOOK_APPOINTMENT\]/g);
  for (const match of bookingMatches) {
    try {
      const data = JSON.parse(match[1].trim()) as BookingAction;
      const { error } = await supabase.from("bookings").insert({
        agent_id: agentId,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        booking_date: data.booking_date,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: data.notes || null,
        status: "confirmed",
      });
      if (error) {
        results.messages.push(`❌ Failed to create booking: ${error.message}`);
      } else {
        results.messages.push(`✅ Booking confirmed for ${data.customer_name} on ${data.booking_date} at ${data.start_time}`);
      }
    } catch (e) {
      console.error("Booking parse error:", e);
    }
  }

  // Process order actions
  const orderMatches = fullText.matchAll(/\[CREATE_ORDER\]([\s\S]*?)\[\/CREATE_ORDER\]/g);
  for (const match of orderMatches) {
    try {
      const data = JSON.parse(match[1].trim()) as OrderAction;
      const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const tax = Math.round(subtotal * 0.1 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        agent_id: agentId,
        order_number: orderNumber,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        delivery_address: data.delivery_address || null,
        payment_method: data.payment_method || null,
        payment_status: "unpaid",
        subtotal, tax, total,
        notes: data.notes || null,
        status: "pending",
      }).select("id").single();

      if (orderErr) {
        results.messages.push(`❌ Failed to create order: ${orderErr.message}`);
      } else if (order) {
        const items = data.items.map(i => ({
          order_id: order.id,
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: Math.round(i.quantity * i.unit_price * 100) / 100,
        }));
        await supabase.from("order_items").insert(items);
        for (const item of data.items) {
          if (item.product_id) {
            const { data: prod } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).single();
            if (prod && prod.stock_quantity !== null) {
              await supabase.from("products").update({ stock_quantity: Math.max(0, prod.stock_quantity - item.quantity) }).eq("id", item.product_id);
            }
          }
        }
        results.messages.push(`✅ Order #${orderNumber} created — $${total.toFixed(2)}`);
      }
    } catch (e) {
      console.error("Order parse error:", e);
    }
  }

  // Process document generation actions
  const docMatches = fullText.matchAll(/\[GENERATE_DOCUMENT\]([\s\S]*?)\[\/GENERATE_DOCUMENT\]/g);
  for (const match of docMatches) {
    try {
      const data = JSON.parse(match[1].trim());
      const response = await supabase.functions.invoke("generate-document", {
        body: {
          template_id: data.template_id,
          agent_id: agentId,
          data: {
            customer_name: data.customer_name || "",
            customer_email: data.customer_email || "",
            customer_phone: data.customer_phone || "",
            customer_address: data.customer_address || "",
            items: data.items || [],
            notes: data.notes || "",
            due_date: data.due_date || "",
            valid_until: data.valid_until || "",
            payment_method: data.payment_method || "",
            payment_status: data.payment_status || "",
            tax_rate: data.tax_rate || 0,
            discount: data.discount || 0,
            custom_fields: data.custom_fields || {},
            sections: data.sections || {},
          },
        },
      });

      if (response.error) {
        results.messages.push(`❌ Failed to generate document: ${response.error.message}`);
      } else if (response.data) {
        const docData = response.data as any;
        results.messages.push(`✅ Document #${docData.document_number} generated`);
        if (docData.file_url) {
          results.documentLinks.push({ label: `📄 Document #${docData.document_number}`, url: docData.file_url });
        }
      }
    } catch (e) {
      console.error("Document parse error:", e);
    }
  }

  // Process collect info actions
  const infoMatches = fullText.matchAll(/\[COLLECT_INFO\]([\s\S]*?)\[\/COLLECT_INFO\]/g);
  for (const match of infoMatches) {
    try {
      const data = JSON.parse(match[1].trim());
      const { error } = await supabase.from("inquiries").insert({
        agent_id: agentId,
        customer_name: data.customer_name || "",
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        subject: data.subject || null,
        message: data.message || null,
        custom_fields: data.custom_fields || {},
        status: "new",
        conversation_id: conversationId || null,
        summary: data.summary || null,
        question_type: data.question_type || "general",
      });
      if (error) {
        results.messages.push(`❌ Failed to save inquiry: ${error.message}`);
      } else {
        results.messages.push(`✅ Inquiry submitted for ${data.customer_name}`);
      }
    } catch (e) {
      console.error("Collect info parse error:", e);
    }
  }

  return results;
}

export function hasActionMarkers(text: string): boolean {
  return /\[BOOK_APPOINTMENT\]/.test(text) || /\[CREATE_ORDER\]/.test(text) || /\[GENERATE_DOCUMENT\]/.test(text) || /\[COLLECT_INFO\]/.test(text);
}
