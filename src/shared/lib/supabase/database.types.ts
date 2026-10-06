// Hand-written subset of the generated Supabase types, covering only the
// tables this first pass touches. Replace with the real output of
// `supabase gen types typescript --local` once the Supabase CLI/Docker are
// available — keep the same shape (Database.public.Tables.<table>.Row/Insert/Update)
// so callers don't need to change. `Relationships: []` on every table and the
// empty `Views`/`Functions` records are required for @supabase/postgrest-js's
// GenericTable/GenericSchema constraints — without them, every query's return
// type collapses to `never`.

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          currency: string;
          security_level: "libre" | "accueil_protege" | "tout_protege";
          documents_lock_enabled: boolean;
          emergency_contacts_unlocked: boolean;
          onboarding_pain_points: string[];
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["families"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["families"]["Row"]>;
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          role: "parent" | "enfant";
          access_status: "managed" | "invited_pending" | "linked" | null;
          linked_account_id: string | null;
          age: number | null;
          signature_color: string;
          dark_mode_enabled: boolean;
          rdv_prive_autorise: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["family_members"]["Row"]> & {
          family_id: string;
          name: string;
          role: "parent" | "enfant";
        };
        Update: Partial<Database["public"]["Tables"]["family_members"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          subject_id: string | null;
          actor_id: string | null;
          location_contact_id: string | null;
          location_text: string | null;
          assignment_status: "auto_assignee" | "assignee" | "partagee" | "a_discuter" | "a_decider";
          recurrence_type: "none" | "weekly_pattern";
          recurrence_days: number[];
          visibility: "private" | "family";
          is_urgent: boolean;
          sujet_id: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & { family_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      budget_categories: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          target_amount: number | null;
          target_period: "week" | "month";
          show_on_home: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["budget_categories"]["Row"]> & {
          family_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["budget_categories"]["Row"]>;
        Relationships: [];
      };
      budget_lines: {
        Row: {
          id: string;
          family_id: string;
          category_id: string;
          financial_type: "fixe_fixe" | "fixe_variable" | "variable_prevue" | "variable_imprevue";
          amount: number;
          periodicity: "mensuel" | "trimestriel" | "annuel" | null;
          spent_on: string;
          responsible_id: string | null;
          visibility: "private" | "family";
          validation_status: "proposee" | "validee" | "ajustee" | "refusee";
          proposed_by: string | null;
          task_id: string | null;
          receipt_photo_url: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["budget_lines"]["Row"]> & {
          family_id: string;
          category_id: string;
          financial_type: "fixe_fixe" | "fixe_variable" | "variable_prevue" | "variable_imprevue";
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["budget_lines"]["Row"]>;
        Relationships: [];
      };
      budget_line_cycles: {
        Row: {
          id: string;
          budget_line_id: string;
          period_month: string;
          status: "paye" | "non_paye";
          paid_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["budget_line_cycles"]["Row"]> & {
          budget_line_id: string;
          period_month: string;
        };
        Update: Partial<Database["public"]["Tables"]["budget_line_cycles"]["Row"]>;
        Relationships: [];
      };
      task_categories: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          necessite_contact_lieu: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_categories"]["Row"]> & {
          family_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_categories"]["Row"]>;
        Relationships: [];
      };
      reward_systems: {
        Row: {
          id: string;
          child_id: string;
          type: "badge" | "etoile" | "note" | "compteur" | "aucun";
          compensation_type: "financiere_indexee" | "financiere_libre" | "credit_comportement" | "aucune";
          unlock_mode: "progressif" | "final";
          visual_theme: "ferme" | "foret" | "ocean" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reward_systems"]["Row"]> & { child_id: string };
        Update: Partial<Database["public"]["Tables"]["reward_systems"]["Row"]>;
        Relationships: [];
      };
      // Tables de liaison : clé composite en base, pas de colonne `id`.
      task_participants: {
        Row: {
          task_id: string;
          member_id: string;
          role_in_task: "auto" | "assigne" | "partage";
        };
        Insert: Database["public"]["Tables"]["task_participants"]["Row"];
        Update: Partial<Database["public"]["Tables"]["task_participants"]["Row"]>;
        Relationships: [];
      };
      task_categories_link: {
        Row: {
          task_id: string;
          category_id: string;
        };
        Insert: Database["public"]["Tables"]["task_categories_link"]["Row"];
        Update: Partial<Database["public"]["Tables"]["task_categories_link"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          family_id: string;
          recipient_id: string;
          category: string;
          title: string;
          body: string | null;
          is_urgent: boolean;
          sent_at: string;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          family_id: string;
          recipient_id: string;
          category: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
