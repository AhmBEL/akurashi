import type { RewardType, ThresholdTemplate, VisualTheme } from "./types";

// Suggestion par défaut selon l'âge — jamais une contrainte (brief §4, Q10).
export function suggestRewardType(age: number | null): Exclude<RewardType, "aucun"> {
  if (age === null) return "badge";
  if (age <= 6) return "etoile";
  if (age <= 12) return "badge";
  return "note";
}

export const DEFAULT_VISUAL_THEME: VisualTheme = "foret";

// Paliers hebdomadaires par défaut (tâches validées dans la semaine).
// Badges : valeurs du brief (Tortue 0-5, Lapin 5-15, Lion 15-34, Licorne 35).
// Étoiles / notes : aucun défaut dans les docs (« à définir ») — proposition à
// valider avec Marine, modifiable dans Réglages. Le premier palier est toujours
// à 0 : l'enfant n'a jamais les mains vides. Le compteur n'a pas de paliers.
export const DEFAULT_THRESHOLDS: Record<RewardType, ThresholdTemplate[]> = {
  badge: [
    { label: "Tortue", thresholdValue: 0 },
    { label: "Lapin", thresholdValue: 5 },
    { label: "Lion", thresholdValue: 15 },
    { label: "Licorne", thresholdValue: 35 },
  ],
  etoile: [
    { label: "1 étoile", thresholdValue: 0 },
    { label: "2 étoiles", thresholdValue: 5 },
    { label: "3 étoiles", thresholdValue: 15 },
    { label: "4 étoiles", thresholdValue: 25 },
    { label: "5 étoiles", thresholdValue: 35 },
  ],
  note: [
    { label: "D", thresholdValue: 0 },
    { label: "C", thresholdValue: 5 },
    { label: "B", thresholdValue: 15 },
    { label: "A", thresholdValue: 35 },
  ],
  compteur: [],
  aucun: [],
};
