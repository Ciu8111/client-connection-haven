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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      anthropometrics: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          body_weight_kg: number | null
          chest_cm: number | null
          client_id: string
          created_at: string
          created_by: string
          height_cm: number | null
          hip_cm: number | null
          id: string
          measured_on: string
          notes: string | null
          thigh_cm: number | null
          waist_cm: number | null
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          body_weight_kg?: number | null
          chest_cm?: number | null
          client_id: string
          created_at?: string
          created_by?: string
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_on?: string
          notes?: string | null
          thigh_cm?: number | null
          waist_cm?: number | null
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          body_weight_kg?: number | null
          chest_cm?: number | null
          client_id?: string
          created_at?: string
          created_by?: string
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_on?: string
          notes?: string | null
          thigh_cm?: number | null
          waist_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anthropometrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          athlete_user_id: string | null
          birth_date: string | null
          coach_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          sport: string | null
        }
        Insert: {
          athlete_user_id?: string | null
          birth_date?: string | null
          coach_id?: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          sport?: string | null
        }
        Update: {
          athlete_user_id?: string | null
          birth_date?: string | null
          coach_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          sport?: string | null
        }
        Relationships: []
      }
      jump_tests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          is_pr: boolean
          notes: string | null
          test_type: string
          tested_on: string
          unit: string
          value: number
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          id?: string
          is_pr?: boolean
          notes?: string | null
          test_type: string
          tested_on?: string
          unit?: string
          value: number
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pr?: boolean
          notes?: string | null
          test_type?: string
          tested_on?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "jump_tests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mesocycle_sheets: {
        Row: {
          client_id: string
          data: Json | null
          mesocycle_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          data?: Json | null
          mesocycle_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          data?: Json | null
          mesocycle_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesocycle_sheets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesocycle_sheets_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: true
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
        ]
      }
      mesocycles: {
        Row: {
          client_id: string
          created_at: string
          goal: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          title: string
          weeks: number
        }
        Insert: {
          client_id: string
          created_at?: string
          goal?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title: string
          weeks?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          goal?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "mesocycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      program_exercises: {
        Row: {
          created_at: string
          day_label: string
          exercise: string
          id: string
          intensity: string | null
          mesocycle_id: string
          notes: string | null
          position: number
          reps: string | null
          rest: string | null
          sets: number | null
        }
        Insert: {
          created_at?: string
          day_label?: string
          exercise: string
          id?: string
          intensity?: string | null
          mesocycle_id: string
          notes?: string | null
          position?: number
          reps?: string | null
          rest?: string | null
          sets?: number | null
        }
        Update: {
          created_at?: string
          day_label?: string
          exercise?: string
          id?: string
          intensity?: string | null
          mesocycle_id?: string
          notes?: string | null
          position?: number
          reps?: string | null
          rest?: string | null
          sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_logs: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          e1rm: number | null
          exercise: string
          id: string
          is_pr: boolean
          load_kg: number
          mesocycle_id: string | null
          notes: string | null
          performed_on: string
          reps: number
          rpe: number | null
          set_number: number | null
          week: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          e1rm?: number | null
          exercise: string
          id?: string
          is_pr?: boolean
          load_kg: number
          mesocycle_id?: string | null
          notes?: string | null
          performed_on?: string
          reps: number
          rpe?: number | null
          set_number?: number | null
          week?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          e1rm?: number | null
          exercise?: string
          id?: string
          is_pr?: boolean
          load_kg?: number
          mesocycle_id?: string | null
          notes?: string | null
          performed_on?: string
          reps?: number
          rpe?: number | null
          set_number?: number | null
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: { Args: { _client: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_athlete: { Args: { _client: string }; Returns: boolean }
      is_client_coach: { Args: { _client: string }; Returns: boolean }
      sheet_bests: {
        Args: { _data: Json }
        Returns: {
          best: number
          name: string
          section: string
        }[]
      }
      sheet_num: { Args: { _v: string }; Returns: number }
    }
    Enums: {
      app_role: "coach" | "athlete"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["coach", "athlete"],
    },
  },
} as const
