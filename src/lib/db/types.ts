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
      user_profiles: {
        Row: {
          id: string
          clerk_user_id: string
          email: string
          name: string
          avatar: string | null
          plan: string
          preferences: Json
          traits: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          email: string
          name: string
          avatar?: string | null
          plan?: string
          preferences?: Json
          traits?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string
          email?: string
          name?: string
          avatar?: string | null
          plan?: string
          preferences?: Json
          traits?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_plan_fkey"
            columns: ["plan"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          name: string
          price: number
          currency: string
          billing_cycle: string
          features: Json
          fallback_rules: Json
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          currency: string
          billing_cycle: string
          features: Json
          fallback_rules: Json
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          currency?: string
          billing_cycle?: string
          features?: Json
          fallback_rules?: Json
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          personality: string
          metadata: Json
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          personality: string
          metadata?: Json
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          personality?: string
          metadata?: Json
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      message_insights: {
        Row: {
          id: string
          message_id: string
          intent: string
          emotion: string
          topics: string[]
          sentiment: string
          confidence: number
          entities: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message_id: string
          intent: string
          emotion: string
          topics: string[]
          sentiment: string
          confidence: number
          entities?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          intent?: string
          emotion?: string
          topics?: string[]
          sentiment?: string
          confidence?: number
          entities?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_insights_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      user_memories: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          message_id: string
          type: string
          content: string
          confidence: number
          source: string
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          message_id: string
          type: string
          content: string
          confidence: number
          source: string
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          message_id?: string
          type?: string
          content?: string
          confidence?: number
          source?: string
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memories_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memories_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      memory_embeddings: {
        Row: {
          id: string
          memory_id: string
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          memory_id: string
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: string
          memory_id?: string
          embedding?: number[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_embeddings_memory_id_fkey"
            columns: ["memory_id"]
            referencedRelation: "user_memories"
            referencedColumns: ["id"]
          }
        ]
      }
      user_traits: {
        Row: {
          id: string
          user_id: string
          trait_key: string
          trait_value: Json
          confidence: number
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trait_key: string
          trait_value: Json
          confidence: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trait_key?: string
          trait_value?: Json
          confidence?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_traits_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      growth_journal: {
        Row: {
          id: string
          user_id: string
          entry_type: string
          content: string
          metrics: Json
          insights: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_type: string
          content: string
          metrics?: Json
          insights?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_type?: string
          content?: string
          metrics?: Json
          insights?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_journal_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      files: {
        Row: {
          id: string
          user_id: string
          conversation_id: string | null
          filename: string
          original_name: string
          mime_type: string
          size: number
          url: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id?: string | null
          filename: string
          original_name: string
          mime_type: string
          size: number
          url: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string | null
          filename?: string
          original_name?: string
          mime_type?: string
          size?: number
          url?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_usage: {
        Row: {
          id: string
          user_id: string
          daily_messages: number
          monthly_messages: number
          total_tokens: number
          last_reset_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          daily_messages?: number
          monthly_messages?: number
          total_tokens?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          daily_messages?: number
          monthly_messages?: number
          total_tokens?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      web_search_results: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          query: string
          results: Json
          provider: string
          search_time: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          query: string
          results: Json
          provider: string
          search_time: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          query?: string
          results?: Json
          provider: string
          search_time?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_search_results_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_search_results_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
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