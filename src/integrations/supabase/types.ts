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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_types: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          created_at: string | null
          duration_min: number | null
          id: string
          is_free: boolean | null
          provider: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          url: string | null
        }
        Insert: {
          created_at?: string | null
          duration_min?: number | null
          id?: string
          is_free?: boolean | null
          provider?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          url?: string | null
        }
        Update: {
          created_at?: string | null
          duration_min?: number | null
          id?: string
          is_free?: boolean | null
          provider?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          url?: string | null
        }
        Relationships: []
      }
      device_connections: {
        Row: {
          access_token: string | null
          connected_at: string | null
          id: string
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["device_provider"]
          refresh_token: string | null
          scopes: string[] | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["device_provider"]
          refresh_token?: string | null
          scopes?: string[] | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["device_provider"]
          refresh_token?: string | null
          scopes?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          caption: string | null
          category_id: string | null
          created_at: string | null
          id: string
          mood: number | null
          occurred_at: string | null
          photo_url: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"] | null
        }
        Insert: {
          caption?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          mood?: number | null
          occurred_at?: string | null
          photo_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"] | null
        }
        Update: {
          caption?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          mood?: number | null
          occurred_at?: string | null
          photo_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_settings: {
        Row: {
          created_at: string | null
          daily_feed_minutes: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_feed_minutes?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_feed_minutes?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      goals_health: {
        Row: {
          created_at: string | null
          id: string
          metric: Database["public"]["Enums"]["health_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          target: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric: Database["public"]["Enums"]["health_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          target: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric?: Database["public"]["Enums"]["health_metric"]
          period?: Database["public"]["Enums"]["goal_period"]
          target?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed_at: string | null
          habit_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string | null
          frequency: string | null
          icon: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_daily: {
        Row: {
          active_calories: number | null
          created_at: string | null
          date: string
          distance_km: number | null
          id: string
          resistance_proxy: number | null
          resistance_volume: number | null
          steps: number | null
          updated_at: string | null
          user_id: string
          workout_minutes: number | null
        }
        Insert: {
          active_calories?: number | null
          created_at?: string | null
          date: string
          distance_km?: number | null
          id?: string
          resistance_proxy?: number | null
          resistance_volume?: number | null
          steps?: number | null
          updated_at?: string | null
          user_id: string
          workout_minutes?: number | null
        }
        Update: {
          active_calories?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          id?: string
          resistance_proxy?: number | null
          resistance_volume?: number | null
          steps?: number | null
          updated_at?: string | null
          user_id?: string
          workout_minutes?: number | null
        }
        Relationships: []
      }
      health_visibility: {
        Row: {
          created_at: string | null
          id: string
          resistance_visibility:
            | Database["public"]["Enums"]["visibility"]
            | null
          steps_visibility: Database["public"]["Enums"]["visibility"] | null
          updated_at: string | null
          user_id: string
          workout_minutes_visibility:
            | Database["public"]["Enums"]["visibility"]
            | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          resistance_visibility?:
            | Database["public"]["Enums"]["visibility"]
            | null
          steps_visibility?: Database["public"]["Enums"]["visibility"] | null
          updated_at?: string | null
          user_id: string
          workout_minutes_visibility?:
            | Database["public"]["Enums"]["visibility"]
            | null
        }
        Update: {
          created_at?: string | null
          id?: string
          resistance_visibility?:
            | Database["public"]["Enums"]["visibility"]
            | null
          steps_visibility?: Database["public"]["Enums"]["visibility"] | null
          updated_at?: string | null
          user_id?: string
          workout_minutes_visibility?:
            | Database["public"]["Enums"]["visibility"]
            | null
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string | null
          id: string
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          handle: string
          id: string
          is_private: boolean | null
          name: string | null
          photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          handle: string
          id?: string
          is_private?: boolean | null
          name?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          handle?: string
          id?: string
          is_private?: boolean | null
          name?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          entry_id: string
          id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_id: string
          id?: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_id?: string
          id?: string
          type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      resistance_sets: {
        Row: {
          created_at: string | null
          exercise: string
          id: string
          reps: number
          session_id: string
          sets: number
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          exercise: string
          id?: string
          reps: number
          session_id: string
          sets: number
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          exercise?: string
          id?: string
          reps?: number
          session_id?: string
          sets?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resistance_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          id: string
          item_id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          activity_type_id: string | null
          created_at: string | null
          end_at: string
          id: string
          note: string | null
          start_at: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"] | null
        }
        Insert: {
          activity_type_id?: string | null
          created_at?: string | null
          end_at: string
          id?: string
          note?: string | null
          start_at: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"] | null
        }
        Update: {
          activity_type_id?: string | null
          created_at?: string | null
          end_at?: string
          id?: string
          note?: string | null
          start_at?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_recurrence: {
        Row: {
          block_id: string
          created_at: string | null
          id: string
          rrule: string
        }
        Insert: {
          block_id: string
          created_at?: string | null
          id?: string
          rrule: string
        }
        Update: {
          block_id?: string
          created_at?: string | null
          id?: string
          rrule?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_recurrence_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "schedule_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          current_streak: number | null
          habit_id: string | null
          id: string
          last_completed_at: string | null
          longest_streak: number | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          habit_id?: string | null
          id?: string
          last_completed_at?: string | null
          longest_streak?: number | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          habit_id?: string | null
          id?: string
          last_completed_at?: string | null
          longest_streak?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string | null
          id: string
          template_items: Json
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          template_items?: Json
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          template_items?: Json
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      time_goals: {
        Row: {
          created_at: string | null
          daily_minutes: number
          id: string
          module: Database["public"]["Enums"]["time_module"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_minutes?: number
          id?: string
          module?: Database["public"]["Enums"]["time_module"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_minutes?: number
          id?: string
          module?: Database["public"]["Enums"]["time_module"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      time_usage: {
        Row: {
          created_at: string | null
          date: string
          id: string
          module: Database["public"]["Enums"]["time_module"]
          seconds_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          module: Database["public"]["Enums"]["time_module"]
          seconds_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          module?: Database["public"]["Enums"]["time_module"]
          seconds_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string | null
          id: string
          minutes: number | null
          notes: string | null
          rpe: number | null
          started_at: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          minutes?: number | null
          notes?: string | null
          rpe?: number | null
          started_at: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          minutes?: number | null
          notes?: string | null
          rpe?: number | null
          started_at?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      content_type:
        | "MUSIC"
        | "AUDIOBOOK"
        | "PODCAST"
        | "CLASS_YOGA"
        | "CLASS_PILATES"
        | "CLASS_MEDITATION"
      device_provider:
        | "APPLE_HEALTH"
        | "HEALTH_CONNECT"
        | "GOOGLE_FIT"
        | "MANUAL"
        | "OURA"
        | "WHOOP"
        | "APPLE_WATCH"
      goal_period: "daily" | "weekly"
      health_metric: "steps" | "workout_minutes" | "resistance"
      reaction_type: "INSPIRE" | "SAVE_IDEA"
      time_module: "FEED" | "EXPLORE" | "CALENDAR" | "PROFILE" | "FOCUS"
      visibility: "public" | "followers" | "private"
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
      content_type: [
        "MUSIC",
        "AUDIOBOOK",
        "PODCAST",
        "CLASS_YOGA",
        "CLASS_PILATES",
        "CLASS_MEDITATION",
      ],
      device_provider: [
        "APPLE_HEALTH",
        "HEALTH_CONNECT",
        "GOOGLE_FIT",
        "MANUAL",
        "OURA",
        "WHOOP",
        "APPLE_WATCH",
      ],
      goal_period: ["daily", "weekly"],
      health_metric: ["steps", "workout_minutes", "resistance"],
      reaction_type: ["INSPIRE", "SAVE_IDEA"],
      time_module: ["FEED", "EXPLORE", "CALENDAR", "PROFILE", "FOCUS"],
      visibility: ["public", "followers", "private"],
    },
  },
} as const
