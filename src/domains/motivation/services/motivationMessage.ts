import type { RewardThreshold, RewardType } from "@/domains/child/types";
import type { TierProgress } from "./progress";

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

// Ce que l'enfant vise au palier suivant, selon son système visuel.
const TARGET_NOUN: Partial<Record<RewardType, string>> = {
  badge: "le badge",
  etoile: "l'étoile",
  note: "la note",
};

// Phrase dynamique et tutoyée (brief §6) ; toujours positive, jamais punitive.
export function motivationMessage(type: RewardType, progress: TierProgress<RewardThreshold>): string {
  const { count, next, isTop, remainingToNext } = progress;

  if (type === "compteur" || type === "aucun" || (!next && !isTop)) {
    return count === 0
      ? "C'est parti ! Chaque tâche compte."
      : `${plural(count, "tâche")} faite${count > 1 ? "s" : ""} cette semaine, continue comme ça !`;
  }

  if (isTop) return "Bravo, tu as tout fait parfaitement !";

  const noun = TARGET_NOUN[type] ?? "le palier";
  if (count === 0) return "C'est parti ! Chaque tâche te rapproche du palier suivant.";

  return `Bravo, plus que ${plural(remainingToNext, "tâche")} pour ${noun} du dessus !`;
}
