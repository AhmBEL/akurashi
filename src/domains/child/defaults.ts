import type { RewardType, VisualTheme } from "./types";

// Suggestion par défaut selon l'âge — jamais une contrainte (brief §4, Q10).
export function suggestRewardType(age: number | null): Exclude<RewardType, "aucun"> {
  if (age === null) return "badge";
  if (age <= 6) return "etoile";
  if (age <= 12) return "badge";
  return "note";
}

export const DEFAULT_VISUAL_THEME: VisualTheme = "foret";
