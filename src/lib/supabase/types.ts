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
          created_at: string
          email: string
          id: string
          is_active: boolean
          line_user_id: string | null
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          name?: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
        }
        Update: {
          created_at?: string
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
