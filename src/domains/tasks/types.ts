export type AssignmentStatus = "auto_assignee" | "assignee" | "partagee" | "a_discuter" | "a_decider";

export interface MemberRef {
  id: string;
  name: string;
  signatureColor: string;
}

// Vue d'une tâche prête à afficher (créateur, participants, catégories résolus).
export interface TaskView {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  dueEndTime: string | null;
  locationText: string | null;
  assignmentStatus: AssignmentStatus;
  isUrgent: boolean;
  isPrivate: boolean;
  sujetId: string | null;
  recurrenceDays: number[]; // 0 = lundi … 6 = dimanche ; vide = ponctuelle
  completedAt: string | null;
  done: boolean;
  creator: MemberRef | null;
  participants: MemberRef[];
  categoryNames: string[];
}

export type TaskBucket = "perso" | "famille" | "ponctuelles";

// Élément de l'agenda : une tâche datée, ou récurrente avec heure. `busyOnly` :
// créneau privé d'un enfant vu par un parent — seule l'heure et la personne restent.
export interface AgendaTask extends TaskView {
  busyOnly: boolean;
}
