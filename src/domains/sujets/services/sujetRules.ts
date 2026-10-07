import type { ClosureMode, SujetStatus, SujetVisibility } from "../types";

// Règles métier des Sujets, pures (sans store ni horloge implicite) : identiques
// en démo et en version finale, testées.

interface MemberLite {
  id: string;
  role: "parent" | "enfant";
}

// On voit un Sujet si on l'a créé ou si on en est participant.
export function canSee(sujet: { createdBy: string | null }, participantIds: string[], viewerId: string): boolean {
  return sujet.createdBy === viewerId || participantIds.includes(viewerId);
}

// La visibilité borne qui peut être participant : privé = le créateur seul,
// entre parents = les parents, famille = tout le monde.
export function allowedParticipantIds(visibility: SujetVisibility, creatorId: string, members: MemberLite[]): string[] {
  if (visibility === "prive") return [creatorId];
  if (visibility === "parents") return members.filter((member) => member.role === "parent").map((member) => member.id);
  return members.map((member) => member.id);
}

// Participants retenus : ceux choisis, dans le périmètre autorisé, et toujours le créateur.
export function normalizeParticipants(
  visibility: SujetVisibility,
  creatorId: string,
  members: MemberLite[],
  chosen: string[]
): string[] {
  const allowed = new Set(allowedParticipantIds(visibility, creatorId, members));
  const kept = [...new Set(chosen)].filter((id) => allowed.has(id));
  return kept.includes(creatorId) ? kept : [creatorId, ...kept];
}

// Un Sujet à clôture automatique archive le lendemain de sa date.
export function effectiveStatus(
  sujet: { status: SujetStatus; closureMode: ClosureMode; eventDate: string | null },
  today: string
): SujetStatus {
  if (sujet.status === "archive") return "archive";
  return sujet.closureMode === "auto_after_date" && sujet.eventDate !== null && sujet.eventDate < today ? "archive" : "ouvert";
}

export function validateClosure(mode: ClosureMode, eventDate: string | null): string | null {
  return mode === "auto_after_date" && !eventDate ? "Choisis la date après laquelle le Sujet se clôture." : null;
}

export function isValidLink(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function progress(tasks: Array<{ done: boolean }>): { done: number; total: number; pct: number } {
  const done = tasks.filter((task) => task.done).length;
  return { done, total: tasks.length, pct: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100) };
}
