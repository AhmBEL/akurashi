import { toDateString } from "@/shared/lib/date";
import { WEEKDAY_LABELS } from "../defaults";
import type { AssignmentStatus, TaskBucket } from "../types";

// Règles métier des tâches, pures (sans store ni horloge implicite) pour être
// testées et identiques en démo et en version finale.

export type ParticipantRole = "auto" | "assigne" | "partage";

export interface AssignmentPlan {
  status: AssignmentStatus;
  subjectId: string; // à qui la tâche appartient
  participants: Array<{ memberId: string; role: ParticipantRole }>;
}

// L'assignation se déduit des participants choisis (champ unique, brief §4) :
// soi seul = auto-assignée, un autre membre = assignée, plusieurs = partagée,
// « à discuter » = signalée sans assignation, rien = à décider.
export function deriveAssignment(creatorId: string, participantIds: string[], discuss: boolean): AssignmentPlan {
  if (discuss) return { status: "a_discuter", subjectId: creatorId, participants: [] };

  const ids = [...new Set(participantIds)];
  if (ids.length === 0) return { status: "a_decider", subjectId: creatorId, participants: [] };

  if (ids.length === 1) {
    const [only] = ids;
    return only === creatorId
      ? { status: "auto_assignee", subjectId: creatorId, participants: [{ memberId: only, role: "auto" }] }
      : { status: "assignee", subjectId: only, participants: [{ memberId: only, role: "assigne" }] };
  }

  return {
    status: "partagee",
    subjectId: creatorId,
    participants: ids.map((memberId) => ({ memberId, role: "partage" as const })),
  };
}

export const isRecurring = (recurrenceDays: number[]): boolean => recurrenceDays.length > 0;

// Lundi = 0 … dimanche = 6, comme `tasks.recurrence_days`.
export const weekdayIndex = (date: Date): number => (date.getDay() + 6) % 7;

// Une tâche récurrente cochée aujourd'hui est faite pour aujourd'hui seulement :
// elle redevient « à faire » le lendemain, sans table d'occurrences.
export function isTaskDone(task: { completedAt: string | null; recurrenceDays: number[] }, today: Date): boolean {
  if (!task.completedAt) return false;
  if (!isRecurring(task.recurrenceDays)) return true;
  return toDateString(new Date(task.completedAt)) === toDateString(today);
}

export function isDueToday(task: { dueDate: string | null; recurrenceDays: number[] }, today: Date): boolean {
  if (isRecurring(task.recurrenceDays)) return task.recurrenceDays.includes(weekdayIndex(today));
  return task.dueDate === null || task.dueDate <= toDateString(today);
}

// Trois blocs de la page par personne (brief §4.4).
export function bucketOf(task: { recurrenceDays: number[]; participantCount: number }): TaskBucket {
  if (!isRecurring(task.recurrenceDays)) return "ponctuelles";
  return task.participantCount <= 1 ? "perso" : "famille";
}

// Une tâche privée n'est visible que par son créateur (espace privé).
export function isVisibleTo(task: { isPrivate: boolean; creatorId: string | null }, viewerId: string): boolean {
  return !task.isPrivate || task.creatorId === viewerId;
}

export function describeRecurrence(recurrenceDays: number[]): string {
  return [...recurrenceDays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(" ");
}
