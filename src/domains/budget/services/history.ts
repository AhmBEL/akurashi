import type { MonthStatus, RuleCycle, RuleLine } from "../types";
import { buildCharges, monthStatus } from "./charges";
import { shiftPeriod } from "./period";

export interface PeriodRecap {
  start: string;
  status: MonthStatus;
  paidCount: number;
  dueCount: number;
}

interface HistoryInput {
  lines: RuleLine[];
  cycles: RuleCycle[];
  resetDay: number;
  currentPeriodStart: string;
  today: string;
  months?: number;
}

// Les périodes écoulées (la plus récente d'abord) qui avaient des charges dues.
export function buildHistory({ lines, cycles, resetDay, currentPeriodStart, today, months = 12 }: HistoryInput): PeriodRecap[] {
  const recaps: PeriodRecap[] = [];
  for (let back = 1; back <= months; back++) {
    const start = shiftPeriod(currentPeriodStart, -back).start;
    const charges = buildCharges({ lines, cycles, resetDay, periodStart: start, today });
    const status = monthStatus(charges);
    if (status) recaps.push({ start, status, paidCount: charges.filter((c) => c.paid).length, dueCount: charges.length });
  }
  return recaps;
}

export interface CategorySpend {
  name: string;
  spent: number;
  target: number; // 0 : pas de plafond
}

export interface Bilan {
  title: string;
  message: string;
  suggestion: string;
}

// Bilan de la période écoulée : toujours encourageant, jamais culpabilisant.
// Une période sans charge due ou une toute première période n'a pas de bilan.
export function buildBilan(previous: PeriodRecap | null, spends: CategorySpend[]): Bilan | null {
  if (!previous) return null;
  const over = spends.filter((spend) => spend.target > 0 && spend.spent > spend.target);
  const allPaid = previous.status === "vert";

  if (allPaid && over.length === 0) {
    return {
      title: "Beau mois !",
      message: "Toutes tes charges étaient réglées et tes plafonds tenus.",
      suggestion: "Tu peux garder exactement le même cap ce mois-ci.",
    };
  }

  const parts: string[] = [];
  parts.push(
    allPaid
      ? "Toutes tes charges étaient réglées."
      : `${previous.paidCount} charge${previous.paidCount > 1 ? "s" : ""} sur ${previous.dueCount} réglée${previous.paidCount > 1 ? "s" : ""}.`
  );
  if (over.length > 0) parts.push(`${over.map((spend) => spend.name).join(" et ")} ${over.length > 1 ? "ont" : "a"} dépassé le plafond : ça arrive.`);

  const suggestion = over.length > 0
    ? `Garde un œil sur « ${over[0].name} » en début de période, ou relève un peu son plafond dans Réglages.`
    : "Coche tes charges dès qu'elles sont faites, ça te donne une vue claire d'un coup d'œil.";

  return { title: allPaid ? "Un mois solide" : "Un mois en cours de route", message: parts.join(" "), suggestion };
}
