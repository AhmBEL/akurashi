export const REWARD_TYPES = ["badge", "etoile", "note", "compteur", "aucun"] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  badge: "Badges animaliers",
  etoile: "Étoiles",
  note: "Notes A–D",
  compteur: "Compteur",
  aucun: "Aucun système",
};

export const COMPENSATION_TYPES = ["financiere_libre", "credit_comportement", "aucune"] as const;
export type CompensationType = (typeof COMPENSATION_TYPES)[number] | "financiere_indexee";

export const COMPENSATION_LABELS: Record<(typeof COMPENSATION_TYPES)[number], string> = {
  financiere_libre: "Argent de poche",
  credit_comportement: "Crédit « bon comportement »",
  aucune: "Aucune",
};

export const VISUAL_THEMES = ["ferme", "foret", "ocean"] as const;
export type VisualTheme = (typeof VISUAL_THEMES)[number];

export const VISUAL_THEME_LABELS: Record<VisualTheme, string> = {
  ferme: "Ferme",
  foret: "Forêt",
  ocean: "Océan",
};

export interface RewardConfig {
  type: RewardType;
  compensationType: CompensationType;
  visualTheme: VisualTheme | null;
}

export const NO_REWARD: RewardConfig = { type: "aucun", compensationType: "aucune", visualTheme: null };

// Palier hebdomadaire : atteint dès que `thresholdValue` tâches sont validées dans la semaine.
export interface RewardThreshold {
  id: string;
  label: string;
  thresholdValue: number;
  amount: number | null; // compensation financière du palier, en centimes (parent seulement)
  sortOrder: number;
}

export interface ThresholdTemplate {
  label: string;
  thresholdValue: number;
}
