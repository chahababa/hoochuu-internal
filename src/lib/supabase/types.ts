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
    PostgrestVersion: "14.5"
  }
  bom: {
    Tables: {
      alerts: {
        Row: {
          alert_type: Database["bom"]["Enums"]["alert_type"]
          baseline_snapshot: Json | null
          context_data: Json | null
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          dish_id: string | null
          email_sent_at: string | null
          id: string
          is_deleted: boolean
          product_id: string | null
          severity: Database["bom"]["Enums"]["alert_severity"]
          status: Database["bom"]["Enums"]["alert_status"]
          store_id: string | null
          threshold_value: number
          trigger_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alert_type: Database["bom"]["Enums"]["alert_type"]
          baseline_snapshot?: Json | null
          context_data?: Json | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dish_id?: string | null
          email_sent_at?: string | null
          id?: string
          is_deleted?: boolean
          product_id?: string | null
          severity: Database["bom"]["Enums"]["alert_severity"]
          status?: Database["bom"]["Enums"]["alert_status"]
          store_id?: string | null
          threshold_value: number
          trigger_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alert_type?: Database["bom"]["Enums"]["alert_type"]
          baseline_snapshot?: Json | null
          context_data?: Json | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dish_id?: string | null
          email_sent_at?: string | null
          id?: string
          is_deleted?: boolean
          product_id?: string | null
          severity?: Database["bom"]["Enums"]["alert_severity"]
          status?: Database["bom"]["Enums"]["alert_status"]
          store_id?: string | null
          threshold_value?: number
          trigger_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          actor_id: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          object_key: string | null
          size_bytes: number | null
          status: string
          target: string
          triggered_by: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          object_key?: string | null
          size_bytes?: number | null
          status: string
          target: string
          triggered_by: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          object_key?: string | null
          size_bytes?: number | null
          status?: string
          target?: string
          triggered_by?: string
        }
        Relationships: []
      }
      cost_baselines: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          notes: string | null
          scope_key: string
          target_cost_rate: number
          updated_at: string
          updated_by: string | null
          warning_cost_rate: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          notes?: string | null
          scope_key?: string
          target_cost_rate: number
          updated_at?: string
          updated_by?: string | null
          warning_cost_rate: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          notes?: string | null
          scope_key?: string
          target_cost_rate?: number
          updated_at?: string
          updated_by?: string | null
          warning_cost_rate?: number
        }
        Relationships: []
      }
      cost_snapshots: {
        Row: {
          based_on_prices: Json | null
          calculated_at: string
          created_at: string
          dine_in_cost: number | null
          dine_in_rate: number | null
          dish_id: string
          dish_version_id: string
          id: string
          is_locked: boolean
          locked_by_report_id: string | null
          store_id: string
          takeout_cost: number | null
          takeout_rate: number | null
        }
        Insert: {
          based_on_prices?: Json | null
          calculated_at?: string
          created_at?: string
          dine_in_cost?: number | null
          dine_in_rate?: number | null
          dish_id: string
          dish_version_id: string
          id?: string
          is_locked?: boolean
          locked_by_report_id?: string | null
          store_id: string
          takeout_cost?: number | null
          takeout_rate?: number | null
        }
        Update: {
          based_on_prices?: Json | null
          calculated_at?: string
          created_at?: string
          dine_in_cost?: number | null
          dine_in_rate?: number | null
          dish_id?: string
          dish_version_id?: string
          id?: string
          is_locked?: boolean
          locked_by_report_id?: string | null
          store_id?: string
          takeout_cost?: number | null
          takeout_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_snapshots_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_snapshots_dish_version_id_fkey"
            columns: ["dish_version_id"]
            isOneToOne: false
            referencedRelation: "dish_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      current_prices: {
        Row: {
          based_on_purchase_ids: string[]
          calculated_at: string
          product_id: string
          scope_key: string
          weighted_avg_price: number
        }
        Insert: {
          based_on_purchase_ids: string[]
          calculated_at?: string
          product_id: string
          scope_key: string
          weighted_avg_price: number
        }
        Update: {
          based_on_purchase_ids?: string[]
          calculated_at?: string
          product_id?: string
          scope_key?: string
          weighted_avg_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "current_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_versions: {
        Row: {
          bom_items: Json
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          dish_id: string
          effective_from: string
          id: string
          is_deleted: boolean
          notes: string | null
          takeout_pack_combo_id: string | null
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          bom_items: Json
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dish_id: string
          effective_from?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          takeout_pack_combo_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number: number
        }
        Update: {
          bom_items?: Json
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dish_id?: string
          effective_from?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          takeout_pack_combo_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dish_versions_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_versions_takeout_pack_combo_id_fkey"
            columns: ["takeout_pack_combo_id"]
            isOneToOne: false
            referencedRelation: "takeout_pack_combos"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          category: string | null
          cost_baseline_id: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          price: number | null
          service_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          cost_baseline_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          price?: number | null
          service_mode: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          cost_baseline_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          price?: number | null
          service_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dishes_cost_baseline"
            columns: ["cost_baseline_id"]
            isOneToOne: false
            referencedRelation: "cost_baselines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dishes_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "dish_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          created_at: string
          error_message: string
          id: string
          import_batch_id: string
          raw_data: Json | null
          row_number: number | null
          sheet_name: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          import_batch_id: string
          raw_data?: Json | null
          row_number?: number | null
          sheet_name?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          import_batch_id?: string
          raw_data?: Json | null
          row_number?: number | null
          sheet_name?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          merged_into_id: string | null
          name: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          merged_into_id?: string | null
          name: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          merged_into_id?: string | null
          name?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_lock_audit: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["bom"]["Enums"]["monthly_lock_event_type"]
          id: string
          metadata: Json | null
          month: number
          reason: string | null
          year: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["bom"]["Enums"]["monthly_lock_event_type"]
          id?: string
          metadata?: Json | null
          month: number
          reason?: string | null
          year: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["bom"]["Enums"]["monthly_lock_event_type"]
          id?: string
          metadata?: Json | null
          month?: number
          reason?: string | null
          year?: number
        }
        Relationships: []
      }
      monthly_locks: {
        Row: {
          last_unlock_reason: string | null
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          locked_at: string
          locked_by: string | null
          month: number
          status: Database["bom"]["Enums"]["monthly_lock_status"]
          year: number
        }
        Insert: {
          last_unlock_reason?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          locked_at?: string
          locked_by?: string | null
          month: number
          status?: Database["bom"]["Enums"]["monthly_lock_status"]
          year: number
        }
        Update: {
          last_unlock_reason?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          locked_at?: string
          locked_by?: string | null
          month?: number
          status?: Database["bom"]["Enums"]["monthly_lock_status"]
          year?: number
        }
        Relationships: []
      }
      price_change_log: {
        Row: {
          change_pct: number | null
          change_reason: string
          created_at: string
          id: string
          new_price: number
          old_price: number | null
          product_id: string
          scope_key: string
          triggered_by_purchase_id: string | null
          triggered_by_user: string | null
        }
        Insert: {
          change_pct?: number | null
          change_reason: string
          created_at?: string
          id?: string
          new_price: number
          old_price?: number | null
          product_id: string
          scope_key: string
          triggered_by_purchase_id?: string | null
          triggered_by_user?: string | null
        }
        Update: {
          change_pct?: number | null
          change_reason?: string
          created_at?: string
          id?: string
          new_price?: number
          old_price?: number | null
          product_id?: string
          scope_key?: string
          triggered_by_purchase_id?: string | null
          triggered_by_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_log_triggered_by_purchase_id_fkey"
            columns: ["triggered_by_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_records"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          ingredient_id: string
          is_deleted: boolean
          merged_into_id: string | null
          name: string
          purchase_type: string
          spec: string | null
          status: string
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          ingredient_id: string
          is_deleted?: boolean
          merged_into_id?: string | null
          name: string
          purchase_type: string
          spec?: string | null
          status?: string
          unit: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          ingredient_id?: string
          is_deleted?: boolean
          merged_into_id?: string | null
          name?: string
          purchase_type?: string
          spec?: string | null
          status?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_records: {
        Row: {
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          is_temporary: boolean
          product_id: string
          purchase_date: string
          quantity: number
          receipt_image_url: string | null
          store_id: string
          supplier: string | null
          total_amount: number
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          is_temporary?: boolean
          product_id: string
          purchase_date: string
          quantity: number
          receipt_image_url?: string | null
          store_id: string
          supplier?: string | null
          total_amount: number
          unit_price: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          is_temporary?: boolean
          product_id?: string
          purchase_date?: string
          quantity?: number
          receipt_image_url?: string | null
          store_id?: string
          supplier?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      query_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          params: Json | null
          resource: string
          user_id: string
          user_role: string
          user_store_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          params?: Json | null
          resource: string
          user_id: string
          user_role: string
          user_store_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          params?: Json | null
          resource?: string
          user_id?: string
          user_role?: string
          user_store_id?: string | null
        }
        Relationships: []
      }
      semi_product_versions: {
        Row: {
          bom_items: Json
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          effective_from: string
          id: string
          is_deleted: boolean
          notes: string | null
          semi_product_id: string
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          bom_items: Json
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          effective_from?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          semi_product_id: string
          updated_at?: string
          updated_by?: string | null
          version_number: number
        }
        Update: {
          bom_items?: Json
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          effective_from?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          semi_product_id?: string
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "semi_product_versions_semi_product_id_fkey"
            columns: ["semi_product_id"]
            isOneToOne: false
            referencedRelation: "semi_products"
            referencedColumns: ["id"]
          },
        ]
      }
      semi_products: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          standard_output_qty: number
          standard_output_unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          standard_output_qty: number
          standard_output_unit: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          standard_output_qty?: number
          standard_output_unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_semi_products_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "semi_product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      takeout_pack_combos: {
        Row: {
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          items: Json
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          items: Json
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          items?: Json
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_auto_lock_previous_month: { Args: never; Returns: undefined }
      fn_calc_dish_cost: {
        Args: { p_dish_id: string; p_store_id: string }
        Returns: undefined
      }
      fn_call_backup_purge: { Args: never; Returns: undefined }
      fn_exec_restore_sql: { Args: { p_sql: string }; Returns: undefined }
      fn_get_scope_key: {
        Args: { p_product_id: string; p_store_id: string }
        Returns: string
      }
      fn_is_month_locked:
        | { Args: { p_date: string }; Returns: boolean }
        | { Args: { p_ts: string }; Returns: boolean }
      fn_lock_month: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      fn_purge_query_audit_old: { Args: never; Returns: undefined }
      fn_recalc_current_price: {
        Args: { p_product_id: string; p_scope_key: string }
        Returns: undefined
      }
      fn_record_query_audit: {
        Args: { p_action: string; p_params: Json; p_resource: string }
        Returns: undefined
      }
      fn_send_monthly_lock_notification: {
        Args: {
          p_action: string
          p_actor_email: string
          p_month: number
          p_reason: string
          p_year: number
        }
        Returns: undefined
      }
      fn_trigger_backup: {
        Args: { p_target: string; p_triggered_by: string }
        Returns: string
      }
      fn_trigger_recalc_costs_for_product: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      fn_unlock_month: {
        Args: { p_month: number; p_reason: string; p_year: number }
        Returns: undefined
      }
      suggest_similar_ingredients: {
        Args: { query: string }
        Returns: {
          category: string
          id: string
          name: string
          similarity_score: number
        }[]
      }
      suggest_similar_products: {
        Args: { query: string }
        Returns: {
          brand: string
          id: string
          ingredient_id: string
          name: string
          similarity_score: number
          spec: string
        }[]
      }
    }
    Enums: {
      alert_severity: "immediate" | "weekly_digest"
      alert_status: "open" | "acknowledged" | "resolved"
      alert_type: "variance" | "absolute"
      monthly_lock_event_type:
        | "lock"
        | "unlock"
        | "lock_noop"
        | "auto_lock"
        | "system_restore"
      monthly_lock_status: "locked" | "unlocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      focus_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          month: string | null
          set_by: string | null
          source: Database["public"]["Enums"]["focus_source"]
          store_id: string | null
          type: Database["public"]["Enums"]["focus_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          month?: string | null
          set_by?: string | null
          source?: Database["public"]["Enums"]["focus_source"]
          store_id?: string | null
          type: Database["public"]["Enums"]["focus_type"]
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          month?: string | null
          set_by?: string | null
          source?: Database["public"]["Enums"]["focus_source"]
          store_id?: string | null
          type?: Database["public"]["Enums"]["focus_type"]
        }
        Relationships: [
          {
            foreignKeyName: "focus_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_items_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_tasks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notion_page_id: string | null
          notion_synced_at: string | null
          resolution_note: string | null
          resolution_photo_urls: string[]
          resolved_at: string | null
          resolved_by: string | null
          score_id: string
          status: Database["public"]["Enums"]["improvement_status"]
          store_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notion_page_id?: string | null
          notion_synced_at?: string | null
          resolution_note?: string | null
          resolution_photo_urls?: string[]
          resolved_at?: string | null
          resolved_by?: string | null
          score_id: string
          status?: Database["public"]["Enums"]["improvement_status"]
          store_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notion_page_id?: string | null
          notion_synced_at?: string | null
          resolution_note?: string | null
          resolution_photo_urls?: string[]
          resolved_at?: string | null
          resolved_by?: string | null
          score_id?: string
          status?: Database["public"]["Enums"]["improvement_status"]
          store_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "improvement_tasks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_tasks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_tasks_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "inspection_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_tasks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          is_base: boolean
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_base?: boolean
          name: string
          sort_order: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_base?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_menu_items: {
        Row: {
          dish_name: string | null
          id: string
          inspection_id: string
          observation_note: string | null
          photo_url: string | null
          portion_weight: number | null
          type: Database["public"]["Enums"]["menu_item_type"]
        }
        Insert: {
          dish_name?: string | null
          id?: string
          inspection_id: string
          observation_note?: string | null
          photo_url?: string | null
          portion_weight?: number | null
          type: Database["public"]["Enums"]["menu_item_type"]
        }
        Update: {
          dish_name?: string | null
          id?: string
          inspection_id?: string
          observation_note?: string | null
          photo_url?: string | null
          portion_weight?: number | null
          type?: Database["public"]["Enums"]["menu_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inspection_menu_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          created_at: string
          id: string
          is_standard: boolean
          photo_url: string
          score_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_standard?: boolean
          photo_url: string
          score_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_standard?: boolean
          photo_url?: string
          score_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "inspection_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_scores: {
        Row: {
          applied_tag_types: Database["public"]["Enums"]["focus_type"][]
          consecutive_weeks: number
          has_prev_issue: boolean
          id: string
          inspection_id: string
          is_focus_item: boolean
          item_id: string
          note: string | null
          score: number
        }
        Insert: {
          applied_tag_types?: Database["public"]["Enums"]["focus_type"][]
          consecutive_weeks?: number
          has_prev_issue?: boolean
          id?: string
          inspection_id: string
          is_focus_item?: boolean
          item_id: string
          note?: string | null
          score: number
        }
        Update: {
          applied_tag_types?: Database["public"]["Enums"]["focus_type"][]
          consecutive_weeks?: number
          has_prev_issue?: boolean
          id?: string
          inspection_id?: string
          is_focus_item?: boolean
          item_id?: string
          note?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_scores_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_scores_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_staff: {
        Row: {
          id: string
          inspection_id: string
          role_in_shift: Database["public"]["Enums"]["staff_position"]
          staff_id: string
        }
        Insert: {
          id?: string
          inspection_id: string
          role_in_shift: Database["public"]["Enums"]["staff_position"]
          staff_id: string
        }
        Update: {
          id?: string
          inspection_id?: string
          role_in_shift?: Database["public"]["Enums"]["staff_position"]
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_staff_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          busyness_level: Database["public"]["Enums"]["busyness_level"]
          created_at: string
          date: string
          id: string
          inspector_id: string
          is_editable: boolean
          store_id: string
          time_slot: string
          total_score: number
          updated_at: string
        }
        Insert: {
          busyness_level?: Database["public"]["Enums"]["busyness_level"]
          created_at?: string
          date: string
          id?: string
          inspector_id: string
          is_editable?: boolean
          store_id: string
          time_slot: string
          total_score?: number
          updated_at?: string
        }
        Update: {
          busyness_level?: Database["public"]["Enums"]["busyness_level"]
          created_at?: string
          date?: string
          id?: string
          inspector_id?: string
          is_editable?: boolean
          store_id?: string
          time_slot?: string
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          inspection_id: string
          score: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          inspection_id: string
          score?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          inspection_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legacy_notes_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          module: string
          read_at: string | null
          severity: string
          store_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          module: string
          read_at?: string | null
          severity?: string
          store_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          module?: string
          read_at?: string | null
          severity?: string
          store_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      release_announcements: {
        Row: {
          audience: Database["public"]["Enums"]["release_announcement_audience"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          published_on: string
          source_ref: string | null
          source_type: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["release_announcement_audience"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          published_on?: string
          source_ref?: string | null
          source_type?: string | null
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["release_announcement_audience"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          published_on?: string
          source_ref?: string | null
          source_type?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          position: Database["public"]["Enums"]["staff_position"]
          status: Database["public"]["Enums"]["staff_status"]
          store_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          position: Database["public"]["Enums"]["staff_position"]
          status?: Database["public"]["Enums"]["staff_status"]
          store_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: Database["public"]["Enums"]["staff_position"]
          status?: Database["public"]["Enums"]["staff_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_extra_items: {
        Row: {
          item_id: string
          store_id: string
        }
        Insert: {
          item_id: string
          store_id: string
        }
        Update: {
          item_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_extra_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_extra_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_method: string | null
          can_access_bom: boolean
          can_access_inspection: boolean
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          line_user_id: string | null
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_id: string | null
        }
        Insert: {
          auth_method?: string | null
          can_access_bom?: boolean
          can_access_inspection?: boolean
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          name?: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
        }
        Update: {
          auth_method?: string | null
          can_access_bom?: boolean
          can_access_inspection?: boolean
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_can_access_bom: { Args: never; Returns: boolean }
      current_user_id: { Args: never; Returns: string }
      current_user_profile: {
        Args: never
        Returns: {
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          store_id: string
        }[]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_user_store_id: { Args: never; Returns: string }
      fn_notify: {
        Args: {
          p_body: string
          p_link: string
          p_metadata: Json
          p_module: string
          p_severity: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      fn_notify_role: {
        Args: {
          p_body: string
          p_link: string
          p_metadata: Json
          p_module: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_severity: string
          p_store_id: string
          p_title: string
          p_type: string
        }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      busyness_level: "low" | "medium" | "high"
      field_type: "kitchen" | "floor" | "none"
      focus_source: "manual" | "complaint_sync"
      focus_type: "critical" | "monthly_attention" | "complaint_watch"
      improvement_status: "pending" | "resolved" | "verified" | "superseded"
      menu_item_type: "dine_in" | "takeout"
      release_announcement_audience: "all" | "owner_manager" | "leader"
      staff_position: "kitchen" | "floor" | "counter"
      staff_status: "active" | "archived"
      user_role: "owner" | "manager" | "leader"
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
  bom: {
    Enums: {
      alert_severity: ["immediate", "weekly_digest"],
      alert_status: ["open", "acknowledged", "resolved"],
      alert_type: ["variance", "absolute"],
      monthly_lock_event_type: [
        "lock",
        "unlock",
        "lock_noop",
        "auto_lock",
        "system_restore",
      ],
      monthly_lock_status: ["locked", "unlocked"],
    },
  },
  public: {
    Enums: {
      busyness_level: ["low", "medium", "high"],
      field_type: ["kitchen", "floor", "none"],
      focus_source: ["manual", "complaint_sync"],
      focus_type: ["critical", "monthly_attention", "complaint_watch"],
      improvement_status: ["pending", "resolved", "verified", "superseded"],
      menu_item_type: ["dine_in", "takeout"],
      release_announcement_audience: ["all", "owner_manager", "leader"],
      staff_position: ["kitchen", "floor", "counter"],
      staff_status: ["active", "archived"],
      user_role: ["owner", "manager", "leader"],
    },
  },
} as const
