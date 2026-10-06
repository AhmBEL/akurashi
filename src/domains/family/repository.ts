import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore, NewRow } from "@/shared/data/types";
import { resolveCurrentMemberId } from "@/shared/session/session";
import type { Family, FamilyMember, FamilyState } from "./types";

// Le seul endroit autorisé à lire/écrire `families` et `family_members`
// (un repository par domaine), toujours via le DataStore.

export type FamilyRow = Database["public"]["Tables"]["families"]["Row"];
export type FamilyMemberRow = Database["public"]["Tables"]["family_members"]["Row"];

const toMember = (row: FamilyMemberRow): FamilyMember => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  role: row.role,
  signatureColor: row.signature_color,
  darkModeEnabled: row.dark_mode_enabled,
  linkedAccountId: row.linked_account_id,
});

const toFamily = (row: FamilyRow): Family => ({
  id: row.id,
  name: row.name,
  currency: row.currency,
  securityLevel: row.security_level,
});

async function listActiveMembers(store: DataStore, familyId?: string): Promise<FamilyMemberRow[]> {
  const rows = await store.list<FamilyMemberRow>("family_members", familyId ? { family_id: familyId } : undefined);
  return rows.filter((row) => !row.deleted_at);
}

export async function loadFamilyState(store: DataStore): Promise<FamilyState | null> {
  const candidates = await listActiveMembers(store);
  const currentId = await resolveCurrentMemberId(candidates);
  const current = candidates.find((row) => row.id === currentId);
  if (!current) return null;

  const familyRow = await store.get<FamilyRow>("families", current.family_id);
  if (!familyRow) return null;

  const members = candidates.filter((row) => row.family_id === current.family_id);
  return { member: toMember(current), family: toFamily(familyRow), members: members.map(toMember) };
}

export interface CreateFamilyInput {
  name: string;
  currency: string;
  painPoints: string[];
}

export async function createFamily(store: DataStore, input: CreateFamilyInput): Promise<Family> {
  const row = await store.create<FamilyRow>("families", {
    name: input.name,
    currency: input.currency,
    security_level: "libre",
    documents_lock_enabled: true,
    emergency_contacts_unlocked: true,
    onboarding_pain_points: input.painPoints,
  } satisfies NewRow<FamilyRow>);
  return toFamily(row);
}

export interface CreateFamilyMemberInput {
  familyId: string;
  name: string;
  role: "parent" | "enfant";
  age: number | null;
  signatureColor: string;
  accessStatus: "managed" | "invited_pending" | "linked" | null;
  linkedAccountId: string | null;
}

export async function createFamilyMember(store: DataStore, input: CreateFamilyMemberInput): Promise<FamilyMember> {
  const row = await store.create<FamilyMemberRow>("family_members", {
    family_id: input.familyId,
    name: input.name,
    role: input.role,
    access_status: input.accessStatus,
    linked_account_id: input.linkedAccountId,
    age: input.age,
    signature_color: input.signatureColor,
    dark_mode_enabled: false,
    rdv_prive_autorise: false,
    deleted_at: null,
  } satisfies NewRow<FamilyMemberRow>);
  return toMember(row);
}
