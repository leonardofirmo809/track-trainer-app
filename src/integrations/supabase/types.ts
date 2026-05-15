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
      admin_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event"]
          id: string
          metadata: Json
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["audit_event"]
          id?: string
          metadata?: Json
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["audit_event"]
          id?: string
          metadata?: Json
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      coach_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_by?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          specialty: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          birth_date: string | null
          coach_id: string
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          goal: string | null
          id: string
          injury_history: string | null
          level: Database["public"]["Enums"]["student_level"] | null
          notes: string | null
          phone: string | null
          target_distance: Database["public"]["Enums"]["target_distance"] | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          coach_id: string
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          goal?: string | null
          id?: string
          injury_history?: string | null
          level?: Database["public"]["Enums"]["student_level"] | null
          notes?: string | null
          phone?: string | null
          target_distance?:
            | Database["public"]["Enums"]["target_distance"]
            | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          coach_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          goal?: string | null
          id?: string
          injury_history?: string | null
          level?: Database["public"]["Enums"]["student_level"] | null
          notes?: string | null
          phone?: string | null
          target_distance?:
            | Database["public"]["Enums"]["target_distance"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          coach_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json
          notes: string | null
          pace_seconds_per_km: number | null
          student_id: string
          test_date: string
          test_type: Database["public"]["Enums"]["test_type"]
        }
        Insert: {
          coach_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          pace_seconds_per_km?: number | null
          student_id: string
          test_date?: string
          test_type?: Database["public"]["Enums"]["test_type"]
        }
        Update: {
          coach_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          pace_seconds_per_km?: number | null
          student_id?: string
          test_date?: string
          test_type?: Database["public"]["Enums"]["test_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          coach_id: string
          created_at: string
          end_date: string | null
          id: string
          payload: Json
          plan_type: Database["public"]["Enums"]["plan_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["plan_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          payload?: Json
          plan_type: Database["public"]["Enums"]["plan_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          payload?: Json
          plan_type?: Database["public"]["Enums"]["plan_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_coaches: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          has_role: boolean
          id: string
          students_count: number
        }[]
      }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          full_name: string
          status: Database["public"]["Enums"]["invite_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach"
      audit_event:
        | "invite_created"
        | "invite_revoked"
        | "invite_resent"
        | "invite_accepted"
        | "coach_created_manual"
        | "coach_role_removed"
      invite_status: "pending" | "accepted" | "revoked"
      plan_status: "ativa" | "concluida" | "arquivada"
      plan_type: "5km" | "10km" | "21km" | "42km"
      student_level: "iniciante" | "intermediario" | "avancado"
      target_distance: "5km" | "10km" | "21km" | "42km"
      test_type: "3km" | "5km" | "10km" | "outro"
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
      app_role: ["admin", "coach"],
      audit_event: [
        "invite_created",
        "invite_revoked",
        "invite_resent",
        "invite_accepted",
        "coach_created_manual",
        "coach_role_removed",
      ],
      invite_status: ["pending", "accepted", "revoked"],
      plan_status: ["ativa", "concluida", "arquivada"],
      plan_type: ["5km", "10km", "21km", "42km"],
      student_level: ["iniciante", "intermediario", "avancado"],
      target_distance: ["5km", "10km", "21km", "42km"],
      test_type: ["3km", "5km", "10km", "outro"],
    },
  },
} as const
