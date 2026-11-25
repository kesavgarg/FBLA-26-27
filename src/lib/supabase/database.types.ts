export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      allergies: {
        Row: {
          created_at: string;
          family_member_id: string | null;
          id: string;
          profile_id: string | null;
          reaction: string | null;
          severity: string;
          substance: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          family_member_id?: string | null;
          id?: string;
          profile_id?: string | null;
          reaction?: string | null;
          severity?: string;
          substance: string;
        };
        Update: {
          created_at?: string;
          family_member_id?: string | null;
          id?: string;
          profile_id?: string | null;
          reaction?: string | null;
          severity?: string;
          substance?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allergies_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allergies_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["user_role"] | null;
          created_at: string;
          details: NonNullable<Json>;
          id: number;
          target_id: string | null;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["user_role"] | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["user_role"] | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      consult_requests: {
        Row: {
          allergies_snapshot: string[];
          created_at: string;
          decided_at: string | null;
          doctor_id: string | null;
          doctor_note: string | null;
          id: string;
          info_request: string | null;
          medications_snapshot: string[];
          patient_id: string;
          patient_reply: string | null;
          requested_product_id: string | null;
          status: Database["public"]["Enums"]["consult_status"];
          summary: string;
          symptom_log_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          allergies_snapshot?: string[];
          created_at?: string;
          decided_at?: string | null;
          doctor_id?: string | null;
          doctor_note?: string | null;
          id?: string;
          info_request?: string | null;
          medications_snapshot?: string[];
          patient_id: string;
          patient_reply?: string | null;
          requested_product_id?: string | null;
          status?: Database["public"]["Enums"]["consult_status"];
          summary: string;
          symptom_log_id?: string | null;
          updated_at?: string;
        };
        Update: {
          allergies_snapshot?: string[];
          created_at?: string;
          decided_at?: string | null;
          doctor_id?: string | null;
          doctor_note?: string | null;
          id?: string;
          info_request?: string | null;
          medications_snapshot?: string[];
          patient_id?: string;
          patient_reply?: string | null;
          requested_product_id?: string | null;
          status?: Database["public"]["Enums"]["consult_status"];
          summary?: string;
          symptom_log_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consult_requests_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consult_requests_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consult_requests_requested_product_id_fkey";
            columns: ["requested_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consult_requests_symptom_log_id_fkey";
            columns: ["symptom_log_id"];
            isOneToOne: false;
            referencedRelation: "symptom_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      current_medications: {
        Row: {
          created_at: string;
          id: string;
          ingredient: string | null;
          name: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          ingredient?: string | null;
          name: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ingredient?: string | null;
          name?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "current_medications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      family_members: {
        Row: {
          birth_year: number;
          created_at: string;
          full_name: string;
          id: string;
          owner_id: string;
          relationship: string;
        };
        ComputedFields: never;
        Insert: {
          birth_year: number;
          created_at?: string;
          full_name: string;
          id?: string;
          owner_id: string;
          relationship: string;
        };
        Update: {
          birth_year?: number;
          created_at?: string;
          full_name?: string;
          id?: string;
          owner_id?: string;
          relationship?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_members_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          low_stock_threshold: number;
          product_id: string;
          quantity: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          low_stock_threshold?: number;
          product_id: string;
          quantity: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          low_stock_threshold?: number;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          consult_id: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["message_kind"];
          order_id: string | null;
          read_at: string | null;
          refill_id: string | null;
          sender_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          consult_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          order_id?: string | null;
          read_at?: string | null;
          refill_id?: string | null;
          sender_id?: string | null;
        };
        Update: {
          body?: string;
          consult_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          order_id?: string | null;
          read_at?: string | null;
          refill_id?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_consult_id_fkey";
            columns: ["consult_id"];
            isOneToOne: false;
            referencedRelation: "consult_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_refill_id_fkey";
            columns: ["refill_id"];
            isOneToOne: false;
            referencedRelation: "refill_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          is_taxable: boolean;
          order_id: string;
          prescription_id: string | null;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          is_taxable: boolean;
          order_id: string;
          prescription_id?: string | null;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
        };
        Update: {
          id?: string;
          is_taxable?: boolean;
          order_id?: string;
          prescription_id?: string | null;
          product_id?: string;
          quantity?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "prescriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cancel_reason: string | null;
          created_at: string;
          customer_id: string;
          delivery_city: string | null;
          delivery_fee_cents: number;
          delivery_line1: string | null;
          delivery_notes: string | null;
          delivery_zip: string | null;
          family_member_id: string | null;
          fulfillment: Database["public"]["Enums"]["fulfillment_method"];
          id: string;
          idempotency_key: string;
          is_simulated_payment: boolean;
          order_number: string;
          pickup_slot_id: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          created_at?: string;
          customer_id: string;
          delivery_city?: string | null;
          delivery_fee_cents?: number;
          delivery_line1?: string | null;
          delivery_notes?: string | null;
          delivery_zip?: string | null;
          family_member_id?: string | null;
          fulfillment: Database["public"]["Enums"]["fulfillment_method"];
          id?: string;
          idempotency_key: string;
          is_simulated_payment?: boolean;
          order_number: string;
          pickup_slot_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          updated_at?: string;
        };
        Update: {
          cancel_reason?: string | null;
          created_at?: string;
          customer_id?: string;
          delivery_city?: string | null;
          delivery_fee_cents?: number;
          delivery_line1?: string | null;
          delivery_notes?: string | null;
          delivery_zip?: string | null;
          family_member_id?: string | null;
          fulfillment?: Database["public"]["Enums"]["fulfillment_method"];
          id?: string;
          idempotency_key?: string;
          is_simulated_payment?: boolean;
          order_number?: string;
          pickup_slot_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_pickup_slot_id_fkey";
            columns: ["pickup_slot_id"];
            isOneToOne: false;
            referencedRelation: "pickup_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_slots: {
        Row: {
          booked_count: number;
          capacity: number;
          id: string;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          booked_count?: number;
          capacity: number;
          id?: string;
          starts_at: string;
        };
        Update: {
          booked_count?: number;
          capacity?: number;
          id?: string;
          starts_at?: string;
        };
        Relationships: [];
      };
      prescriptions: {
        Row: {
          consult_id: string | null;
          created_at: string;
          directions: string;
          expires_on: string;
          id: string;
          patient_id: string;
          prescriber_id: string | null;
          product_id: string;
          refills_remaining: number;
          rx_number: string;
          status: Database["public"]["Enums"]["prescription_status"];
          written_on: string;
        };
        ComputedFields: never;
        Insert: {
          consult_id?: string | null;
          created_at?: string;
          directions: string;
          expires_on: string;
          id?: string;
          patient_id: string;
          prescriber_id?: string | null;
          product_id: string;
          refills_remaining?: number;
          rx_number: string;
          status?: Database["public"]["Enums"]["prescription_status"];
          written_on?: string;
        };
        Update: {
          consult_id?: string | null;
          created_at?: string;
          directions?: string;
          expires_on?: string;
          id?: string;
          patient_id?: string;
          prescriber_id?: string | null;
          product_id?: string;
          refills_remaining?: number;
          rx_number?: string;
          status?: Database["public"]["Enums"]["prescription_status"];
          written_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prescriptions_consult_id_fkey";
            columns: ["consult_id"];
            isOneToOne: false;
            referencedRelation: "consult_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_prescriber_id_fkey";
            columns: ["prescriber_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active_ingredient: string | null;
          category: Database["public"]["Enums"]["product_category"];
          created_at: string;
          description: string;
          description_es: string;
          id: string;
          image_alt: string | null;
          image_path: string | null;
          is_active: boolean;
          is_featured: boolean;
          name: string;
          name_es: string;
          price_cents: number;
          requires_rx: boolean;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active_ingredient?: string | null;
          category: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          description: string;
          description_es: string;
          id?: string;
          image_alt?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          name: string;
          name_es: string;
          price_cents: number;
          requires_rx?: boolean;
          slug: string;
          updated_at?: string;
        };
        Update: {
          active_ingredient?: string | null;
          category?: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          description?: string;
          description_es?: string;
          id?: string;
          image_alt?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          name?: string;
          name_es?: string;
          price_cents?: number;
          requires_rx?: boolean;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          date_of_birth: string | null;
          email: string;
          full_name: string;
          id: string;
          is_demo: boolean;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          title: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          date_of_birth?: string | null;
          email: string;
          full_name: string;
          id: string;
          is_demo?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date_of_birth?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          is_demo?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      refill_requests: {
        Row: {
          completed_at: string | null;
          fulfillment: Database["public"]["Enums"]["fulfillment_method"];
          id: string;
          order_id: string | null;
          patient_id: string;
          pickup_slot_id: string | null;
          prescription_id: string;
          requested_at: string;
          staff_note: string | null;
          status: Database["public"]["Enums"]["refill_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          fulfillment: Database["public"]["Enums"]["fulfillment_method"];
          id?: string;
          order_id?: string | null;
          patient_id: string;
          pickup_slot_id?: string | null;
          prescription_id: string;
          requested_at?: string;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["refill_status"];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          fulfillment?: Database["public"]["Enums"]["fulfillment_method"];
          id?: string;
          order_id?: string | null;
          patient_id?: string;
          pickup_slot_id?: string | null;
          prescription_id?: string;
          requested_at?: string;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["refill_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refill_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refill_requests_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refill_requests_pickup_slot_id_fkey";
            columns: ["pickup_slot_id"];
            isOneToOne: false;
            referencedRelation: "pickup_slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refill_requests_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "prescriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      store_settings: {
        Row: {
          delivery_fee_cents: number;
          free_delivery_threshold_cents: number;
          hours: NonNullable<Json>;
          id: number;
          pharmacist_name: string;
          slot_capacity: number;
          slot_minutes: number;
          tax_rate_bps: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          delivery_fee_cents?: number;
          free_delivery_threshold_cents?: number;
          hours: NonNullable<Json>;
          id?: number;
          pharmacist_name?: string;
          slot_capacity?: number;
          slot_minutes?: number;
          tax_rate_bps?: number;
          updated_at?: string;
        };
        Update: {
          delivery_fee_cents?: number;
          free_delivery_threshold_cents?: number;
          hours?: NonNullable<Json>;
          id?: number;
          pharmacist_name?: string;
          slot_capacity?: number;
          slot_minutes?: number;
          tax_rate_bps?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      symptom_logs: {
        Row: {
          family_member_id: string | null;
          id: string;
          is_simulated_wearable: boolean;
          logged_at: string;
          notes: string | null;
          patient_id: string;
          red_flags: string[];
          severity: number;
          started_on: string;
          symptoms: string[];
          temperature_f: number | null;
          triage_result: Database["public"]["Enums"]["triage_outcome"] | null;
          wearable_snapshot: Json | null;
        };
        ComputedFields: never;
        Insert: {
          family_member_id?: string | null;
          id?: string;
          is_simulated_wearable?: boolean;
          logged_at?: string;
          notes?: string | null;
          patient_id: string;
          red_flags?: string[];
          severity: number;
          started_on: string;
          symptoms: string[];
          temperature_f?: number | null;
          triage_result?: Database["public"]["Enums"]["triage_outcome"] | null;
          wearable_snapshot?: Json | null;
        };
        Update: {
          family_member_id?: string | null;
          id?: string;
          is_simulated_wearable?: boolean;
          logged_at?: string;
          notes?: string | null;
          patient_id?: string;
          red_flags?: string[];
          severity?: number;
          started_on?: string;
          symptoms?: string[];
          temperature_f?: number | null;
          triage_result?: Database["public"]["Enums"]["triage_outcome"] | null;
          wearable_snapshot?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "symptom_logs_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "symptom_logs_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      usability_sessions: {
        Row: {
          click_count: number | null;
          completed: boolean;
          consent_given: boolean;
          feedback: string | null;
          id: string;
          method: string;
          participant_code: string;
          recorded_at: string;
          recorded_by: string | null;
          seconds_taken: number | null;
          task: string;
        };
        ComputedFields: never;
        Insert: {
          click_count?: number | null;
          completed: boolean;
          consent_given: boolean;
          feedback?: string | null;
          id?: string;
          method: string;
          participant_code: string;
          recorded_at?: string;
          recorded_by?: string | null;
          seconds_taken?: number | null;
          task: string;
        };
        Update: {
          click_count?: number | null;
          completed?: boolean;
          consent_given?: boolean;
          feedback?: string | null;
          id?: string;
          method?: string;
          participant_code?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          seconds_taken?: number | null;
          task?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usability_sessions_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          budget_limit_cents: number | null;
          high_contrast: boolean;
          large_text: boolean;
          locale: string;
          profile_id: string;
          reduce_motion: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          budget_limit_cents?: number | null;
          high_contrast?: boolean;
          large_text?: boolean;
          locale?: string;
          profile_id: string;
          reduce_motion?: boolean;
          updated_at?: string;
        };
        Update: {
          budget_limit_cents?: number | null;
          high_contrast?: boolean;
          large_text?: boolean;
          locale?: string;
          profile_id?: string;
          reduce_motion?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      demo_user_id: { Args: { p_key: string }; Returns: string };
      ensure_pickup_slots: { Args: { p_days?: number }; Returns: number };
      is_care_team: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_doctor: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      log_audit: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
      reset_demo_data: { Args: Record<PropertyKey, never>; Returns: Json };
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"];
          target_user: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      consult_status:
        "submitted" | "under_review" | "needs_info" | "approved" | "denied";
      fulfillment_method: "pickup" | "delivery";
      message_kind: "message" | "status_update" | "pickup_ready";
      order_status:
        | "received"
        | "preparing"
        | "ready_for_pickup"
        | "out_for_delivery"
        | "completed"
        | "cancelled";
      prescription_status:
        "pending_approval" | "active" | "inactive" | "denied";
      product_category:
        | "pain_relief"
        | "cold_flu"
        | "vitamins"
        | "first_aid"
        | "personal_care"
        | "health_essentials"
        | "gifts"
        | "prescription";
      refill_status:
        | "requested"
        | "verified"
        | "preparing"
        | "ready"
        | "completed"
        | "rejected"
        | "cancelled";
      triage_outcome: "EMERGENCY" | "CONSULT" | "SELF_CARE";
      user_role: "customer" | "staff" | "doctor" | "owner";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      consult_status: [
        "submitted",
        "under_review",
        "needs_info",
        "approved",
        "denied",
      ],
      fulfillment_method: ["pickup", "delivery"],
      message_kind: ["message", "status_update", "pickup_ready"],
      order_status: [
        "received",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      prescription_status: ["pending_approval", "active", "inactive", "denied"],
      product_category: [
        "pain_relief",
        "cold_flu",
        "vitamins",
        "first_aid",
        "personal_care",
        "health_essentials",
        "gifts",
        "prescription",
      ],
      refill_status: [
        "requested",
        "verified",
        "preparing",
        "ready",
        "completed",
        "rejected",
        "cancelled",
      ],
      triage_outcome: ["EMERGENCY", "CONSULT", "SELF_CARE"],
      user_role: ["customer", "staff", "doctor", "owner"],
    },
  },
} as const;
