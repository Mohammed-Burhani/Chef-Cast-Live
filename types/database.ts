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
          is_admin: boolean
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
          is_admin?: boolean
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
          is_admin?: boolean
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
          like_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          episode_id?: string | null
          image_url: string
          caption?: string | null
          like_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          episode_id?: string | null
          image_url?: string
          caption?: string | null
          like_count?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
