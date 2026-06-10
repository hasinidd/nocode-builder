export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      addon_products: {
        Row: {
          addon_type: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          price: number
          quantity: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          addon_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          price?: number
          quantity?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          addon_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          price?: number
          quantity?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      addon_purchases: {
        Row: {
          addon_type: string
          created_at: string
          expires_at: string | null
          id: string
          purchased_at: string
          quantity: number
          remaining: number
          user_id: string
        }
        Insert: {
          addon_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          purchased_at?: string
          quantity?: number
          remaining?: number
          user_id: string
        }
        Update: {
          addon_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          purchased_at?: string
          quantity?: number
          remaining?: number
          user_id?: string
        }
        Relationships: []
      }
      agent_availability: {
        Row: {
          agent_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_availability_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_blocked_slots: {
        Row: {
          agent_id: string
          blocked_date: string
          created_at: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          agent_id: string
          blocked_date: string
          created_at?: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
        }
        Update: {
          agent_id?: string
          blocked_date?: string
          created_at?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_blocked_slots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_blocked_slots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_collect_fields: {
        Row: {
          agent_id: string
          created_at: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean
          sort_order: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_collect_fields_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collect_fields_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_payment_methods: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          instructions: string | null
          is_enabled: boolean
          method_name: string
          method_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          method_name: string
          method_type?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          method_name?: string
          method_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_payment_methods_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_methods_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          avatar_url: string | null
          created_at: string
          default_currency: string
          default_language: string
          id: string
          knowledge_base: string | null
          name: string
          notify_bookings: boolean
          notify_inquiries: boolean
          notify_orders: boolean
          owner_whatsapp_number: string | null
          personality: Database["public"]["Enums"]["agent_personality"]
          status: Database["public"]["Enums"]["agent_status"]
          system_prompt: string
          updated_at: string
          user_id: string
          welcome_message: string
        }
        Insert: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          default_language?: string
          id?: string
          knowledge_base?: string | null
          name?: string
          notify_bookings?: boolean
          notify_inquiries?: boolean
          notify_orders?: boolean
          owner_whatsapp_number?: string | null
          personality?: Database["public"]["Enums"]["agent_personality"]
          status?: Database["public"]["Enums"]["agent_status"]
          system_prompt?: string
          updated_at?: string
          user_id: string
          welcome_message?: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          default_language?: string
          id?: string
          knowledge_base?: string | null
          name?: string
          notify_bookings?: boolean
          notify_inquiries?: boolean
          notify_orders?: boolean
          owner_whatsapp_number?: string | null
          personality?: Database["public"]["Enums"]["agent_personality"]
          status?: Database["public"]["Enums"]["agent_status"]
          system_prompt?: string
          updated_at?: string
          user_id?: string
          welcome_message?: string
        }
        Relationships: []
      }
      ai_credit_rules: {
        Row: {
          created_at: string
          credits_cost: number
          id: string
          task_key: string
          task_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_cost?: number
          id?: string
          task_key: string
          task_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_cost?: number
          id?: string
          task_key?: string
          task_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agent_id: string
          booking_date: string
          conversation_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string
          id: string
          notes: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          booking_date: string
          conversation_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          booking_date?: string
          conversation_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          bot_paused: boolean
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          bot_paused?: boolean
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          bot_paused?: boolean
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          agent_id: string
          business_info: Json
          content_sections: Json
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          sort_order: number
          styling: Json
          template_type: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          business_info?: Json
          content_sections?: Json
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          styling?: Json
          template_type?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          business_info?: Json
          content_sections?: Json
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          styling?: Json
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          agent_id: string
          content: string | null
          created_at: string
          faq_id: string
          file_name: string | null
          id: string
          item_type: Database["public"]["Enums"]["welcome_item_type"]
          media_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          content?: string | null
          created_at?: string
          faq_id: string
          file_name?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["welcome_item_type"]
          media_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          content?: string | null
          created_at?: string
          faq_id?: string
          file_name?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["welcome_item_type"]
          media_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          agent_id: string
          answer: string
          created_at: string
          id: string
          is_active: boolean
          is_sequence: boolean
          linked_product_id: string | null
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_sequence?: boolean
          linked_product_id?: string | null
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_sequence?: boolean
          linked_product_id?: string | null
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_log: {
        Row: {
          agent_id: string
          conversation_id: string
          customer_phone: string
          id: string
          message_content: string | null
          send_count: number
          sent_at: string
        }
        Insert: {
          agent_id: string
          conversation_id: string
          customer_phone: string
          id?: string
          message_content?: string | null
          send_count?: number
          sent_at?: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          customer_phone?: string
          id?: string
          message_content?: string | null
          send_count?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_rules: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          interval_minutes: number
          is_enabled: boolean
          max_sends: number
          message_template: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          interval_minutes?: number
          is_enabled?: boolean
          max_sends?: number
          message_template?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          interval_minutes?: number
          is_enabled?: boolean
          max_sends?: number
          message_template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          document_data: Json
          document_number: string
          file_url: string | null
          id: string
          status: string
          template_id: string | null
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          document_data?: Json
          document_number: string
          file_url?: string | null
          id?: string
          status?: string
          template_id?: string | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          document_data?: Json
          document_number?: string
          file_url?: string | null
          id?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          connected_at: string
          encrypted_refresh_token: string
          google_email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          encrypted_refresh_token: string
          google_email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          encrypted_refresh_token?: string
          google_email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          custom_fields: Json | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          message: string | null
          question_type: string | null
          status: string
          subject: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          question_type?: string | null
          status?: string
          subject?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          question_type?: string | null
          status?: string
          subject?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          agent_id: string
          channel: string
          created_at: string
          delay_minutes: number
          entity_type: string
          event_key: string
          id: string
          is_enabled: boolean
          message_template: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          channel?: string
          created_at?: string
          delay_minutes?: number
          entity_type?: string
          event_key?: string
          id?: string
          is_enabled?: boolean
          message_template?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          channel?: string
          created_at?: string
          delay_minutes?: number
          entity_type?: string
          event_key?: string
          id?: string
          is_enabled?: boolean
          message_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          ai_credits: number
          contacts_limit: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
          yearly_price: number
          yearly_stripe_price_id: string | null
        }
        Insert: {
          ai_credits?: number
          contacts_limit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
          yearly_price?: number
          yearly_stripe_price_id?: string | null
        }
        Update: {
          ai_credits?: number
          contacts_limit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
          yearly_price?: number
          yearly_stripe_price_id?: string | null
        }
        Relationships: []
      }
      processed_wa_messages: {
        Row: {
          agent_id: string | null
          id: string
          message_key: string
          processed_at: string
        }
        Insert: {
          agent_id?: string | null
          id?: string
          message_key: string
          processed_at?: string
        }
        Update: {
          agent_id?: string | null
          id?: string
          message_key?: string
          processed_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          agent_id: string
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          media_urls: Json | null
          metadata: Json
          name: string
          payment_link_enabled: boolean
          price: number
          sort_order: number
          stock_quantity: number | null
          updated_at: string
          variants: Json | null
        }
        Insert: {
          agent_id: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          media_urls?: Json | null
          metadata?: Json
          name: string
          payment_link_enabled?: boolean
          price?: number
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          agent_id?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          media_urls?: Json | null
          metadata?: Json
          name?: string
          payment_link_enabled?: boolean
          price?: number
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          cumulative_assistant_messages: number
          cumulative_conversations: number
          cumulative_messages: number
          display_name: string | null
          id: string
          management_messages: number
          plan_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          cumulative_assistant_messages?: number
          cumulative_conversations?: number
          cumulative_messages?: number
          display_name?: string | null
          id?: string
          management_messages?: number
          plan_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          cumulative_assistant_messages?: number
          cumulative_conversations?: number
          cumulative_messages?: number
          display_name?: string | null
          id?: string
          management_messages?: number
          plan_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sequence_send_log: {
        Row: {
          conversation_id: string
          id: string
          item_id: string | null
          item_index: number
          sent_at: string
          sequence_key: string
          sequence_kind: string
        }
        Insert: {
          conversation_id: string
          id?: string
          item_id?: string | null
          item_index: number
          sent_at?: string
          sequence_key: string
          sequence_kind: string
        }
        Update: {
          conversation_id?: string
          id?: string
          item_id?: string | null
          item_index?: number
          sent_at?: string
          sequence_key?: string
          sequence_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_send_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          agent_id: string
          category: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_available: boolean
          metadata: Json
          name: string
          payment_link_enabled: boolean
          price: number
          sort_order: number
          updated_at: string
          variants: Json | null
        }
        Insert: {
          agent_id: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          metadata?: Json
          name: string
          payment_link_enabled?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          agent_id?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          metadata?: Json
          name?: string
          payment_link_enabled?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "services_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_connections: {
        Row: {
          admin_api_token: string
          agent_id: string
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          store_domain: string
          sync_orders: boolean
          sync_products: boolean
          updated_at: string
        }
        Insert: {
          admin_api_token: string
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          store_domain: string
          sync_orders?: boolean
          sync_products?: boolean
          updated_at?: string
        }
        Update: {
          admin_api_token?: string
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          store_domain?: string
          sync_orders?: boolean
          sync_products?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connections: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean
          livemode: boolean
          stripe_access_token: string
          stripe_account_id: string
          stripe_refresh_token: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          livemode?: boolean
          stripe_access_token: string
          stripe_account_id: string
          stripe_refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          livemode?: boolean
          stripe_access_token?: string
          stripe_account_id?: string
          stripe_refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_definitions: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_packages: {
        Row: {
          ai_credits_used: number
          billing_cycle_start: string
          contacts_used: number
          created_at: string
          id: string
          package_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits_used?: number
          billing_cycle_start?: string
          contacts_used?: number
          created_at?: string
          id?: string
          package_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits_used?: number
          billing_cycle_start?: string
          contacts_used?: number
          created_at?: string
          id?: string
          package_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wasender_accounts: {
        Row: {
          access_token: string
          account_name: string
          created_at: string
          id: string
          is_active: boolean
          max_sessions: number
          updated_at: string
        }
        Insert: {
          access_token: string
          account_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_sessions?: number
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      welcome_items: {
        Row: {
          agent_id: string
          content: string | null
          created_at: string
          file_name: string | null
          id: string
          item_type: Database["public"]["Enums"]["welcome_item_type"]
          media_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["welcome_item_type"]
          media_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["welcome_item_type"]
          media_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_items_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_items_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          meta_access_token: string | null
          meta_business_account_id: string | null
          meta_phone_number_id: string | null
          meta_verify_token: string | null
          phone_number: string | null
          provider: string
          read_incoming_messages: boolean
          session_name: string
          status: string
          updated_at: string
          waha_session_name: string | null
          wasender_account_id: string | null
          wasender_session_id: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          phone_number?: string | null
          provider?: string
          read_incoming_messages?: boolean
          session_name: string
          status?: string
          updated_at?: string
          waha_session_name?: string | null
          wasender_account_id?: string | null
          wasender_session_id?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          phone_number?: string | null
          provider?: string
          read_incoming_messages?: boolean
          session_name?: string
          status?: string
          updated_at?: string
          waha_session_name?: string | null
          wasender_account_id?: string | null
          wasender_session_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_wasender_account_id_fkey"
            columns: ["wasender_account_id"]
            isOneToOne: false
            referencedRelation: "wasender_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_connections: {
        Row: {
          agent_id: string
          consumer_key: string
          consumer_secret: string
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          store_url: string
          sync_orders: boolean
          sync_products: boolean
          updated_at: string
        }
        Insert: {
          agent_id: string
          consumer_key: string
          consumer_secret: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          store_url: string
          sync_orders?: boolean
          sync_products?: boolean
          updated_at?: string
        }
        Update: {
          agent_id?: string
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          store_url?: string
          sync_orders?: boolean
          sync_products?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "woocommerce_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agents_public: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"] | null
          avatar_url: string | null
          created_at: string | null
          default_currency: string | null
          default_language: string | null
          id: string | null
          name: string | null
          personality: Database["public"]["Enums"]["agent_personality"] | null
          status: Database["public"]["Enums"]["agent_status"] | null
          updated_at: string | null
          user_id: string | null
          welcome_message: string | null
        }
        Insert: {
          agent_type?: Database["public"]["Enums"]["agent_type"] | null
          avatar_url?: string | null
          created_at?: string | null
          default_currency?: string | null
          default_language?: string | null
          id?: string | null
          name?: string | null
          personality?: Database["public"]["Enums"]["agent_personality"] | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          updated_at?: string | null
          user_id?: string | null
          welcome_message?: string | null
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"] | null
          avatar_url?: string | null
          created_at?: string | null
          default_currency?: string | null
          default_language?: string | null
          id?: string | null
          name?: string | null
          personality?: Database["public"]["Enums"]["agent_personality"] | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          updated_at?: string | null
          user_id?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_agent_media_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      check_contact_limit: {
        Args: { _agent_id: string; _phone: string }
        Returns: boolean
      }
      deduct_ai_credits: {
        Args: { _task_key: string; _user_id: string }
        Returns: Json
      }
      find_available_wasender_account: { Args: never; Returns: string }
      get_all_customers: { Args: never; Returns: Json }
      get_customer_activity_logs: {
        Args: { _customer_id: string; _limit?: number; _offset?: number }
        Returns: Json
      }
      get_customer_detail: { Args: { _customer_id: string }; Returns: Json }
      get_platform_stats: { Args: never; Returns: Json }
      get_wasender_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_personality: "professional" | "friendly" | "casual"
      agent_status: "draft" | "active" | "paused"
      agent_type:
        | "support_bot"
        | "booking_agent"
        | "order_handler"
        | "general_chatbot"
        | "data_analyst"
        | "inquiry_only"
      app_role: "admin" | "super_admin"
      welcome_item_type: "text" | "image" | "video" | "audio" | "file"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_personality: ["professional", "friendly", "casual"],
      agent_status: ["draft", "active", "paused"],
      agent_type: [
        "support_bot",
        "booking_agent",
        "order_handler",
        "general_chatbot",
        "data_analyst",
        "inquiry_only",
      ],
      app_role: ["admin", "super_admin"],
      welcome_item_type: ["text", "image", "video", "audio", "file"],
    },
  },
} as const
