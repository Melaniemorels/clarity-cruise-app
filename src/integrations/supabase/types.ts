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
      calendar_connections: {
        Row: {
          access_token: string | null
          created_at: string
          ical_url: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          provider: string
          refresh_token: string | null
          sync_error: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          ical_url?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          provider: string
          refresh_token?: string | null
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          ical_url?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          provider?: string
          refresh_token?: string | null
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          category: string
          connection_id: string | null
          created_at: string
          ends_at: string
          external_id: string | null
          id: string
          notes: string | null
          source: string
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          connection_id?: string | null
          created_at?: string
          ends_at: string
          external_id?: string | null
          id?: string
          notes?: string | null
          source?: string
          starts_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          connection_id?: string | null
          created_at?: string
          ends_at?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          source?: string
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
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
      content_violations: {
        Row: {
          ai_confidence: number | null
          content_reference: string | null
          content_type: string
          created_at: string
          id: string
          severity: string
          user_id: string
          violation_type: string
        }
        Insert: {
          ai_confidence?: number | null
          content_reference?: string | null
          content_type: string
          created_at?: string
          id?: string
          severity?: string
          user_id: string
          violation_type: string
        }
        Update: {
          ai_confidence?: number | null
          content_reference?: string | null
          content_type?: string
          created_at?: string
          id?: string
          severity?: string
          user_id?: string
          violation_type?: string
        }
        Relationships: []
      }
      contextual_recommendations: {
        Row: {
          context_type: string
          expires_at: string
          generated_at: string
          id: string
          recommendations: Json
          signals_used: Json
          user_id: string
        }
        Insert: {
          context_type?: string
          expires_at?: string
          generated_at?: string
          id?: string
          recommendations?: Json
          signals_used?: Json
          user_id: string
        }
        Update: {
          context_type?: string
          expires_at?: string
          generated_at?: string
          id?: string
          recommendations?: Json
          signals_used?: Json
          user_id?: string
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
      dwell_events: {
        Row: {
          category: string | null
          created_at: string
          dwell_ms: number
          id: string
          item_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dwell_ms?: number
          id?: string
          item_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dwell_ms?: number
          id?: string
          item_id?: string | null
          source?: string
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
          location: string | null
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
          location?: string | null
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
          location?: string | null
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
      explore_items: {
        Row: {
          category: string
          created_at: string
          creator: string | null
          duration_min: number | null
          id: string
          is_verified: boolean
          language: string | null
          popularity_score: number
          source: string
          tags: string[]
          thumbnail: string | null
          title: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          creator?: string | null
          duration_min?: number | null
          id?: string
          is_verified?: boolean
          language?: string | null
          popularity_score?: number
          source?: string
          tags?: string[]
          thumbnail?: string | null
          title: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          creator?: string | null
          duration_min?: number | null
          id?: string
          is_verified?: boolean
          language?: string | null
          popularity_score?: number
          source?: string
          tags?: string[]
          thumbnail?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      feed_settings: {
        Row: {
          allow_extensions: boolean
          created_at: string | null
          daily_feed_minutes: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_extensions?: boolean
          created_at?: string | null
          daily_feed_minutes?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_extensions?: boolean
          created_at?: string | null
          daily_feed_minutes?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follow_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: string
          target_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          target_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
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
      handle_changes: {
        Row: {
          changed_at: string
          id: string
          new_handle: string
          old_handle: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_handle: string
          old_handle: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_handle?: string
          old_handle?: string
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
          sleep_minutes: number | null
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
          sleep_minutes?: number | null
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
          sleep_minutes?: number | null
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
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      media_consent: {
        Row: {
          consent_given_at: string | null
          consent_version: string | null
          created_at: string
          healthy_verified_mode: boolean
          id: string
          share_calendar_patterns: boolean
          share_health_data: boolean
          share_media_preferences: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_given_at?: string | null
          consent_version?: string | null
          created_at?: string
          healthy_verified_mode?: boolean
          id?: string
          share_calendar_patterns?: boolean
          share_health_data?: boolean
          share_media_preferences?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_given_at?: string | null
          consent_version?: string | null
          created_at?: string
          healthy_verified_mode?: boolean
          id?: string
          share_calendar_patterns?: boolean
          share_health_data?: boolean
          share_media_preferences?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_integrations: {
        Row: {
          access_token: string
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_preferences_cache: {
        Row: {
          data: Json
          expires_at: string
          fetched_at: string
          id: string
          preference_type: string
          provider: string
          user_id: string
        }
        Insert: {
          data?: Json
          expires_at?: string
          fetched_at?: string
          id?: string
          preference_type: string
          provider: string
          user_id: string
        }
        Update: {
          data?: Json
          expires_at?: string
          fetched_at?: string
          id?: string
          preference_type?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      media_recommendations: {
        Row: {
          context_type: string | null
          expires_at: string
          feedback_rating: number | null
          generated_at: string
          goal: string
          id: string
          recommendations: Json
          signals_used: Json | null
          user_id: string
        }
        Insert: {
          context_type?: string | null
          expires_at?: string
          feedback_rating?: number | null
          generated_at?: string
          goal: string
          id?: string
          recommendations?: Json
          signals_used?: Json | null
          user_id: string
        }
        Update: {
          context_type?: string | null
          expires_at?: string
          feedback_rating?: number | null
          generated_at?: string
          goal?: string
          id?: string
          recommendations?: Json
          signals_used?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string
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
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          activity_tag: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string | null
          location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_tag?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_tag?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_section_visibility: {
        Row: {
          calendar_visibility: string
          created_at: string
          id: string
          posts_visibility: string
          updated_at: string
          user_id: string
          wellness_visibility: string
        }
        Insert: {
          calendar_visibility?: string
          created_at?: string
          id?: string
          posts_visibility?: string
          updated_at?: string
          user_id: string
          wellness_visibility?: string
        }
        Update: {
          calendar_visibility?: string
          created_at?: string
          id?: string
          posts_visibility?: string
          updated_at?: string
          user_id?: string
          wellness_visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_auto_timezone_shift: boolean
          bio: string | null
          created_at: string | null
          current_timezone: string | null
          handle: string
          home_timezone: string | null
          id: string
          is_private: boolean | null
          is_suspended: boolean
          is_traveling: boolean
          name: string | null
          onboarding_completed: boolean
          onboarding_step: string
          phone_number: string | null
          phone_verified: boolean
          photo_url: string | null
          security_onboarding_completed: boolean
          suspended_at: string | null
          suspension_reason: string | null
          travel_detected_reason: string | null
          travel_intensity: string
          travel_mode_status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_auto_timezone_shift?: boolean
          bio?: string | null
          created_at?: string | null
          current_timezone?: string | null
          handle: string
          home_timezone?: string | null
          id?: string
          is_private?: boolean | null
          is_suspended?: boolean
          is_traveling?: boolean
          name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string
          phone_number?: string | null
          phone_verified?: boolean
          photo_url?: string | null
          security_onboarding_completed?: boolean
          suspended_at?: string | null
          suspension_reason?: string | null
          travel_detected_reason?: string | null
          travel_intensity?: string
          travel_mode_status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_auto_timezone_shift?: boolean
          bio?: string | null
          created_at?: string | null
          current_timezone?: string | null
          handle?: string
          home_timezone?: string | null
          id?: string
          is_private?: boolean | null
          is_suspended?: boolean
          is_traveling?: boolean
          name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string
          phone_number?: string | null
          phone_verified?: boolean
          photo_url?: string | null
          security_onboarding_completed?: boolean
          suspended_at?: string | null
          suspension_reason?: string | null
          travel_detected_reason?: string | null
          travel_intensity?: string
          travel_mode_status?: string
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
      recommendation_feedback: {
        Row: {
          action: string
          context_tag: string | null
          created_at: string
          id: string
          item_id: string
          provider: string
          user_id: string
        }
        Insert: {
          action: string
          context_tag?: string | null
          created_at?: string
          id?: string
          item_id: string
          provider?: string
          user_id: string
        }
        Update: {
          action?: string
          context_tag?: string | null
          created_at?: string
          id?: string
          item_id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
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
      seen_items: {
        Row: {
          id: string
          item_id: string
          provider: string
          seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          provider?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          provider?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_plan_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          plan_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          plan_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          plan_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_plan_invites_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "social_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      social_plans: {
        Row: {
          created_at: string
          creator_id: string
          end_minute: number
          id: string
          note: string | null
          plan_date: string
          start_minute: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          end_minute: number
          id?: string
          note?: string | null
          plan_date?: string
          start_minute: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          end_minute?: number
          id?: string
          note?: string | null
          plan_date?: string
          start_minute?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      user_explore_preferences: {
        Row: {
          blocked_creators: string[]
          created_at: string
          goals: string[]
          id: string
          language: string | null
          preferred_tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_creators?: string[]
          created_at?: string
          goals?: string[]
          id?: string
          language?: string | null
          preferred_tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_creators?: string[]
          created_at?: string
          goals?: string[]
          id?: string
          language?: string | null
          preferred_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_item_events: {
        Row: {
          created_at: string
          event: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      watch_notifications: {
        Row: {
          body: string
          context_signals: Json | null
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          is_read: boolean
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          context_signals?: Json | null
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          is_read?: boolean
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          context_signals?: Json | null
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
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
      can_view_user_posts: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_account_lockout: { Args: { check_email: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_login_attempt: {
        Args: {
          attempt_email: string
          attempt_ip?: string
          attempt_success?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      health_metric:
        | "steps"
        | "workout_minutes"
        | "resistance"
        | "sleep_minutes"
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
      app_role: ["admin", "moderator", "user"],
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
      health_metric: [
        "steps",
        "workout_minutes",
        "resistance",
        "sleep_minutes",
      ],
      reaction_type: ["INSPIRE", "SAVE_IDEA"],
      time_module: ["FEED", "EXPLORE", "CALENDAR", "PROFILE", "FOCUS"],
      visibility: ["public", "followers", "private"],
    },
  },
} as const
