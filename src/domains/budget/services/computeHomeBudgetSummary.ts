import type { HomeBudgetSummary } from "../types";
import { computeFixedChargesStatus } from "./computeFixedChargesStatus";

export interface SummaryCategory {
  id: string;
  name: string;
  monthly_target_amount: number | null;
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

export interface SummaryInput {
  categories: SummaryCategory[];
  lines: SummaryLine[];
  cycles: SummaryCycle[];
  monthStart: string; // YYYY-MM-DD, 1er jour du mois courant
  nextMonthStart: string;
}

const FIXED_CHARGE_TYPES = ["fixe_fixe", "fixe_variable"];

// Règles pures, identiques en démo (IndexedDB) et en version finale (Supabase).
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
      const spent = input.lines
        .filter(
          (line) =>
            line.category_id === category.id && line.spent_on >= input.monthStart && line.spent_on < input.nextMonthStart
        )
        .reduce((sum, line) => sum + line.amount, 0);
      const target = category.monthly_target_amount ?? 0;
      const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
      return { categoryId: category.id, label: category.name, spentAmount: spent, targetAmount: target, pct };
    });

  return { fixedChargesStatus: computeFixedChargesStatus(cycleStatuses), gauges };
}
