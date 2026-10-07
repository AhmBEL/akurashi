import type { AgendaTask } from "@/domains/tasks/types";

export const AGENDA_VIEWS = ["mois", "semaine", "jour"] as const;
export type AgendaViewKey = (typeof AGENDA_VIEWS)[number];

export const AGENDA_VIEW_LABELS: Record<AgendaViewKey, string> = {
  mois: "Mois",
  semaine: "Semaine",
  jour: "Jour",
};

// Un élément placé sur un jour précis (une tâche récurrente en produit un par jour concerné).
export interface AgendaEntry {
  taskId: string;
  task: AgendaTask;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  ownerId: string | null; // pour la couleur : premier participant, sinon créateur
  done: boolean;
  busyOnly: boolean;
}

// Temps occupé d'une personne, en minutes depuis minuit.
export interface BusyBand {
  ownerId: string | null;
  startMin: number;
  endMin: number;
}
