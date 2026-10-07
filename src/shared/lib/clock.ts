import { isDemoMode } from "@/shared/config";

// Horloge métier. Toute date « d'aujourd'hui » liée à une règle (période
// budgétaire, prélèvements, tâche du jour, semaine de l'enfant) passe par
// `now()`. En démo, un décalage en jours permet de voir le passage du jour de
// reset ou d'un prélèvement sans attendre ; en version finale il est ignoré.

const STORAGE_KEY = "akurashi.clockOffsetDays";

function readOffset(): number {
  if (!isDemoMode() || typeof window === "undefined") return 0;
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) ? Math.trunc(stored) : 0;
  } catch {
    return 0;
  }
}

export function getClockOffsetDays(): number {
  return readOffset();
}

export function setClockOffsetDays(days: number): void {
  if (typeof window === "undefined") return;
  try {
    if (days === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(Math.trunc(days)));
  } catch {
    // stockage indisponible : l'horloge reste à l'heure réelle
  }
}

export function now(): Date {
  const date = new Date();
  const offset = readOffset();
  if (offset !== 0) date.setDate(date.getDate() + offset);
  return date;
}

export type ClockStep = "day" | "week" | "month";

// Avance l'horloge d'un jour, d'une semaine ou d'un mois calendaire.
export function advanceClock(step: ClockStep): void {
  const current = now();
  const target = new Date(current);
  if (step === "day") target.setDate(target.getDate() + 1);
  else if (step === "week") target.setDate(target.getDate() + 7);
  else target.setMonth(target.getMonth() + 1, Math.min(target.getDate(), 28));
  const dayMs = 24 * 60 * 60 * 1000;
  setClockOffsetDays(readOffset() + Math.round((target.getTime() - current.getTime()) / dayMs));
}
