import type { HomeBudgetGauge, HomeBudgetSummary, RuleCategory, RuleCycle, RuleLine } from "../types";
import { buildCharges } from "./charges";
import { computeFixedChargesStatus } from "./computeFixedChargesStatus";

export type SummaryCategory = RuleCategory;
export type SummaryLine = RuleLine;
export type SummaryCycle = RuleCycle;

// Bornes au format YYYY-MM-DD, fin exclue. La période budgétaire va du jour de
// reset au suivant ; la semaine d'une jauge hebdomadaire va du lundi au lundi.
export interface SummaryInput {
  categories: RuleCategory[];
  lines: RuleLine[];
  cycles: RuleCycle[];
  resetDay: number;
  today: string;
  periodStart: string;
  nextPeriodStart: string;
  weekStart: string;
  nextWeekStart: string;
}

export function computeGauges(input: Omit<SummaryInput, "cycles" | "resetDay" | "today">): HomeBudgetGauge[] {
  return input.categories
    .filter((category) => category.show_on_home)
    .map((category) => {
      const from = category.target_period === "week" ? input.weekStart : input.periodStart;
      const to = category.target_period === "week" ? input.nextWeekStart : input.nextPeriodStart;
      // Seules les dépenses validées ou ajustées comptent (une proposition ou un refus, non).
      const spent = input.lines
        .filter(
          (line) =>
            line.category_id === category.id &&
            line.spent_on >= from &&
            line.spent_on < to &&
            (line.validation_status === "validee" || line.validation_status === "ajustee")
        )
        .reduce((sum, line) => sum + line.amount, 0);
      const target = category.target_amount ?? 0;
      const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
      return { categoryId: category.id, label: category.name, spentAmount: spent, targetAmount: target, pct };
    });
}

// Règles pures, identiques en démo (IndexedDB) et en version finale (Supabase).
// L'accueil ne montre que rouge / orange (04-ecrans-a-construire §2) : le vert
// est réservé à l'écran Budget.
export function computeHomeBudgetSummary(input: SummaryInput): HomeBudgetSummary {
  const charges = buildCharges({
    lines: input.lines,
    cycles: input.cycles,
    resetDay: input.resetDay,
    periodStart: input.periodStart,
    today: input.today,
  });

  return {
    fixedChargesStatus:
      charges.length === 0 ? null : computeFixedChargesStatus(charges.map((charge) => (charge.paid ? "paye" : "non_paye"))),
    gauges: computeGauges(input),
  };
}
