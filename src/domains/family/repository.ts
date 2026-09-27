import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/lib/supabase/database.types";
import type { Family, FamilyMember } from "./types";

type Client = SupabaseClient<Database>;

// The only place in the app allowed to read/write the `families` and
// `family_members` tables directly (Clean Architecture: repository per domain).

export async function getCurrentMember(supabase: Client): Promise<FamilyMember | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("linked_account_id", auth.user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    familyId: data.family_id,
    name: data.name,
    role: data.role,
    signatureColor: data.signature_color,
    darkModeEnabled: data.dark_mode_enabled,
    linkedAccountId: data.linked_account_id,
  };
}

export async function getFamily(supabase: Client, familyId: string): Promise<Family | null> {
  const { data, error } = await supabase.from("families").select("*").eq("id", familyId).single();
  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    securityLevel: data.security_level,
  };
}

export interface CreateFamilyInput {
  name: string;
  painPoints: string[];
}

export async function createFamily(supabase: Client, input: CreateFamilyInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("families")
    .insert({ name: input.name, onboarding_pain_points: input.painPoints })
    .select("id")
    .single();

  return { id: data?.id ?? null, error: error?.message ?? null };
}

export interface CreateFamilyMemberInput {
  familyId: string;
  name: string;
  role: "parent" | "enfant";
  age: number | null;
  signatureColor: string;
  accessStatus?: "managed" | "invited_pending" | "linked";
  linkedAccountId?: string;
}

export async function createFamilyMember(supabase: Client, input: CreateFamilyMemberInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("family_members")
    .insert({
      family_id: input.familyId,
      name: input.name,
      role: input.role,
      age: input.age,
      signature_color: input.signatureColor,
      access_status: input.accessStatus,
      linked_account_id: input.linkedAccountId,
    })
    .select("id")
    .single();

  return { id: data?.id ?? null, error: error?.message ?? null };
}

export async function getFamilyMembers(supabase: Client, familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("family_id", familyId)
    .is("deleted_at", null);

  if (error || !data) return [];

  return data.map((m) => ({
    id: m.id,
    familyId: m.family_id,
    name: m.name,
    role: m.role,
    signatureColor: m.signature_color,
    darkModeEnabled: m.dark_mode_enabled,
    linkedAccountId: m.linked_account_id,
  }));
}
