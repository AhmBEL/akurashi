import type { MemberRef, TaskView } from "@/domains/tasks/types";

export const SUJET_VISIBILITIES = ["prive", "parents", "famille"] as const;
export type SujetVisibility = (typeof SUJET_VISIBILITIES)[number];

export const SUJET_VISIBILITY_LABELS: Record<SujetVisibility, string> = {
  prive: "Privé",
  parents: "Entre parents",
  famille: "Toute la famille",
};

export const CLOSURE_MODES = ["manuel", "auto_after_date"] as const;
export type ClosureMode = (typeof CLOSURE_MODES)[number];

export const CLOSURE_MODE_LABELS: Record<ClosureMode, string> = {
  manuel: "Je le clôture moi-même",
  auto_after_date: "Automatique après la date",
};

export const SUJET_TEMPLATE_KEYS = ["anniversaire", "vacances", "achat_important", "rentree_scolaire", "autre"] as const;
export type SujetTemplateKey = (typeof SUJET_TEMPLATE_KEYS)[number];

export type SujetStatus = "ouvert" | "archive";

export interface SujetCardView {
  id: string;
  title: string;
  template: SujetTemplateKey | null;
  visibility: SujetVisibility;
  closureMode: ClosureMode;
  eventDate: string | null;
  status: SujetStatus; // statut effectif (clôture automatique comprise)
  participants: MemberRef[];
  taskCount: number;
  doneCount: number;
}

export interface CommentView {
  id: string;
  author: MemberRef | null;
  content: string;
  createdAt: string;
}

export interface LinkView {
  id: string;
  label: string;
  url: string;
}

export interface SujetBudget {
  validated: number; // minor units
  pending: number; // dépenses proposées, pas encore validées
}

export interface SujetDetailView extends SujetCardView {
  description: string | null;
  creator: MemberRef | null;
  canEdit: boolean;
  tasks: TaskView[];
  comments: CommentView[];
  links: LinkView[];
  // null : pas de budget à montrer (aucune dépense liée, ou spectateur sans accès à l'argent).
  budget: SujetBudget | null;
}
