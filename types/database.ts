// TypeScript types for Foodilicious: Live database schema
// Auto-generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          xp: number
          level_title: string
          total_correct: number
          episodes_participated: number
          cooking_level: string | null
          cuisines: string[] | null
          gender: string | null
          onboarded_at: string | null
          is_admin: boolean
          is_banned: boolean
          email_notifications_enabled: boolean
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          xp?: number
          level_title?: string
          total_correct?: number
          episodes_participated?: number
          cooking_level?: string | null
          cuisines?: string[] | null
          gender?: string | null
          onboarded_at?: string | null
          is_admin?: boolean
          is_banned?: boolean
          email_notifications_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          xp?: number
          level_title?: string
          total_correct?: number
          episodes_participated?: number
          cooking_level?: string | null
          cuisines?: string[] | null
          gender?: string | null
          onboarded_at?: string | null
          is_admin?: boolean
          is_banned?: boolean
          email_notifications_enabled?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      episodes: {
        Row: {
          id: string
          title: string
          description: string | null
          scheduled_at: string
          is_live: boolean
          status: 'scheduled' | 'live' | 'ended'
          ended_at: string | null
          thumbnail_url: string | null
          youtube_url: string | null
          default_timer_seconds: number
          live_notification_sent: boolean
          live_email_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          scheduled_at: string
          is_live?: boolean
          status?: 'scheduled' | 'live' | 'ended'
          ended_at?: string | null
          thumbnail_url?: string | null
          youtube_url?: string | null
          default_timer_seconds?: number
          live_notification_sent?: boolean
          live_email_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          scheduled_at?: string
          is_live?: boolean
          status?: 'scheduled' | 'live' | 'ended'
          ended_at?: string | null
          thumbnail_url?: string | null
          youtube_url?: string | null
          default_timer_seconds?: number
          live_notification_sent?: boolean
          live_email_sent?: boolean
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          episode_id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          user_id?: string
          text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_episode_id_fkey"
            columns: ["episode_id"]
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: string
          episode_id: string
          question_text: string
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          correct_option: string
          timer_seconds: number
          is_active: boolean
          has_been_activated: boolean
          opened_at: string | null
          closed_at: string | null
          dismissed_at: string | null
          sequence_number: number
          created_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          question_text: string
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          correct_option: string
          timer_seconds?: number
          is_active?: boolean
          has_been_activated?: boolean
          opened_at?: string | null
          closed_at?: string | null
          dismissed_at?: string | null
          sequence_number: number
          created_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          question_text?: string
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          correct_option?: string
          timer_seconds?: number
          is_active?: boolean
          has_been_activated?: boolean
          opened_at?: string | null
          closed_at?: string | null
          dismissed_at?: string | null
          sequence_number?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_episode_id_fkey"
            columns: ["episode_id"]
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      answers: {
        Row: {
          id: string
          user_id: string
          question_id: string
          episode_id: string
          selected_option: string
          is_correct: boolean
          answered_at: string
          response_time_ms: number
          base_points: number
          speed_bonus: number
          total_points: number
          rank: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          episode_id: string
          selected_option: string
          is_correct: boolean
          answered_at?: string
          response_time_ms: number
          base_points: number
          speed_bonus: number
          total_points: number
          rank?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          episode_id?: string
          selected_option?: string
          is_correct?: boolean
          answered_at?: string
          response_time_ms?: number
          base_points?: number
          speed_bonus?: number
          total_points?: number
          rank?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_episode_id_fkey"
            columns: ["episode_id"]
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      episode_scores: {
        Row: {
          id: string
          user_id: string
          episode_id: string
          total_score: number
          correct_count: number
          rank: number | null
          xp_earned: number
          joined_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          episode_id: string
          total_score?: number
          correct_count?: number
          rank?: number | null
          xp_earned?: number
          joined_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          episode_id?: string
          total_score?: number
          correct_count?: number
          rank?: number | null
          xp_earned?: number
          joined_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_scores_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_scores_episode_id_fkey"
            columns: ["episode_id"]
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      badges: {
        Row: {
          id: string
          key: string
          name: string
          description: string
          xp_reward: number
          icon_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description: string
          xp_reward: number
          icon_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string
          xp_reward?: number
          icon_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            referencedRelation: "badges"
            referencedColumns: ["id"]
          }
        ]
      }
      dish_photos: {
        Row: {
          id: string
          user_id: string
          episode_id: string | null
          image_url: string
          caption: string | null
          location: string | null
          tags: string[]
          like_count: number
          is_hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          episode_id?: string | null
          image_url: string
          caption?: string | null
          location?: string | null
          tags?: string[]
          like_count?: number
          is_hidden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          episode_id?: string | null
          image_url?: string
          caption?: string | null
          location?: string | null
          tags?: string[]
          like_count?: number
          is_hidden?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_photos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_photos_episode_id_fkey"
            columns: ["episode_id"]
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      dish_photo_likes: {
        Row: {
          id: string
          user_id: string
          photo_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_photo_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_photo_likes_photo_id_fkey"
            columns: ["photo_id"]
            referencedRelation: "dish_photos"
            referencedColumns: ["id"]
          }
        ]
      }
      content_reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: 'post' | 'comment'
          target_id: string
          reason: string
          details: string | null
          status: 'pending' | 'resolved' | 'dismissed'
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: 'post' | 'comment'
          target_id: string
          reason: string
          details?: string | null
          status?: 'pending' | 'resolved' | 'dismissed'
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: 'post' | 'comment'
          target_id?: string
          reason?: string
          details?: string | null
          status?: 'pending' | 'resolved' | 'dismissed'
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          text: string
          is_hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          text: string
          is_hidden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          text?: string
          is_hidden?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "dish_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      post_comment_likes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comment_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      post_saves: {
        Row: {
          id: string
          user_id: string
          photo_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_photo_id_fkey"
            columns: ["photo_id"]
            referencedRelation: "dish_photos"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          id: string
          user_id: string
          media_url: string
          media_type: 'image' | 'video'
          caption: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_url: string
          media_type?: 'image' | 'video'
          caption?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          media_url?: string
          media_type?: 'image' | 'video'
          caption?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      recipes: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          author_name: string | null
          difficulty: 'easy' | 'medium' | 'hard'
          prep_time_minutes: number
          cook_time_minutes: number
          servings: number
          ingredients: Json
          steps: Json
          nutrition: Json
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          author_name?: string | null
          difficulty?: 'easy' | 'medium' | 'hard'
          prep_time_minutes?: number
          cook_time_minutes?: number
          servings?: number
          ingredients?: Json
          steps?: Json
          nutrition?: Json
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          author_name?: string | null
          difficulty?: 'easy' | 'medium' | 'hard'
          prep_time_minutes?: number
          cook_time_minutes?: number
          servings?: number
          ingredients?: Json
          steps?: Json
          nutrition?: Json
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          title: string
          message: string
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_notifications: {
        Row: {
          id: string
          title: string
          body: string
          target_type: 'all' | 'specific'
          target_user_ids: string[] | null
          deep_link: string | null
          scheduled_at: string
          status: 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed'
          sent_at: string | null
          sent_count: number
          error: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          target_type?: 'all' | 'specific'
          target_user_ids?: string[] | null
          deep_link?: string | null
          scheduled_at: string
          status?: 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed'
          sent_at?: string | null
          sent_count?: number
          error?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          target_type?: 'all' | 'specific'
          target_user_ids?: string[] | null
          deep_link?: string | null
          scheduled_at?: string
          status?: 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed'
          sent_at?: string | null
          sent_count?: number
          error?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_deliveries: {
        Row: {
          id: string
          notification_id: string
          user_id: string
          title: string
          body: string
          deep_link: string | null
          push_status: 'pending' | 'sent' | 'failed' | 'no_token'
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          notification_id: string
          user_id: string
          title: string
          body: string
          deep_link?: string | null
          push_status?: 'pending' | 'sent' | 'failed' | 'no_token'
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          notification_id?: string
          user_id?: string
          title?: string
          body?: string
          deep_link?: string | null
          push_status?: 'pending' | 'sent' | 'failed' | 'no_token'
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_app_setting: {
        Args: { p_key: string }
        Returns: Json
      }
      get_app_setting_bool: {
        Args: { p_key: string; p_default?: boolean }
        Returns: boolean
      }
      get_cron_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          jobname: string
          schedule: string
          command: string
        }[]
      }
      get_community_feed: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
          p_days_back?: number
          p_exclude_ids?: string[]
        }
        Returns: {
          id: string
          user_id: string
          username: string
          avatar_url: string | null
          image_url: string
          caption: string | null
          location: string | null
          tags: string[]
          like_count: number
          comment_count: number
          is_liked: boolean
          is_saved: boolean
          created_at: string
          score: number
        }[]
      }
      get_user_activity: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          activity_type: 'post' | 'comment' | 'like' | 'save'
          post_id: string
          image_url: string
          caption: string | null
          text: string | null
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper type to extract table row types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
