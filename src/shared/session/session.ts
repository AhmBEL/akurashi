import { isDemoMode } from "@/shared/config";
import { createClient } from "@/shared/lib/supabase/client";

const STORAGE_KEY = "akurashi.currentMemberId";
const listeners = new Set<() => void>();

export function getStoredMemberId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Démo : permet de passer d'un profil à l'autre sans se déconnecter.
export function setStoredMemberId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // stockage indisponible : on retombe sur le profil par défaut
  }
  listeners.forEach((callback) => callback());
}

export function subscribeMemberSelection(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export async function getAuthUserId(): Promise<string | null> {
  if (isDemoMode()) return null;
  const { data } = await createClient().auth.getUser();
  return data.user?.id ?? null;
}

interface MemberLike {
  id: string;
  role: string;
  linked_account_id: string | null;
}

// Démo : profil choisi, sinon premier parent. Finale : membre lié au compte connecté.
export async function resolveCurrentMemberId(members: MemberLike[]): Promise<string | null> {
  if (members.length === 0) return null;

  if (isDemoMode()) {
    const stored = getStoredMemberId();
    const chosen = members.find((member) => member.id === stored);
    return (chosen ?? members.find((member) => member.role === "parent") ?? members[0]).id;
  }

  const userId = await getAuthUserId();
  if (!userId) return null;
  return members.find((member) => member.linked_account_id === userId)?.id ?? null;
}
