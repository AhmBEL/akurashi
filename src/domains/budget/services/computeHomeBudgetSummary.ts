import type { HomeBudgetSummary } from "../types";
import { computeFixedChargesStatus } from "./computeFixedChargesStatus";

export interface SummaryCategory {
  id: string;
  name: string;
  target_amount: number | null;
  target_period: "week" | "month";
  show_on_home: boolean;
}

export interface SummaryLine {
  id: string;
  category_id: string;
  financial_type: string;
  amount: number;
  spent_on: string;
}

export interface SummaryCycle {
  budget_line_id: string;
  period_month: string;
  status: "paye" | "non_paye";
}

// Bornes au format YYYY-MM-DD, fin exclue.
export interface SummaryInput {
  categories: SummaryCategory[];
  lines: SummaryLine[];
  cycles: SummaryCycle[];
  monthStart: string;
  nextMonthStart: string;
  weekStart: string;
  nextWeekStart: string;
}

const FIXED_CHARGE_TYPES = ["fixe_fixe", "fixe_variable"];

// Règles pures, identiques en démo (IndexedDB) et en version finale (Supabase).
// Une jauge suit la période de son plafond : semaine (ex. courses) ou mois (ex. loisirs).
export function computeHomeBudgetSummary(input: SummaryInput): HomeBudgetSummary {
  const fixedLineIds = new Set(
    input.lines.filter((line) => FIXED_CHARGE_TYPES.includes(line.financial_type)).map((line) => line.id)
  );
  const cycleStatuses = input.cycles
    .filter((cycle) => cycle.period_month === input.monthStart && fixedLineIds.has(cycle.budget_line_id))
    .map((cycle) => cycle.status);

  const gauges = input.categories
    .filter((category) => category.show_on_home)
    .map((category) => {
      const from = category.target_period === "week" ? input.weekStart : input.monthStart;
      const to = category.target_period === "week" ? input.nextWeekStart : input.nextMonthStart;
      const spent = input.lines
        .filter((line) => line.category_id === category.id && line.spent_on >= from && line.spent_on < to)
        .reduce((sum, line) => sum + line.amount, 0);
      const target = category.target_amount ?? 0;
      const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
      return { categoryId: category.id, label: category.name, spentAmount: spent, targetAmount: target, pct };
    });

  return { fixedChargesStatus: computeFixedChargesStatus(cycleStatuses), gauges };
}
