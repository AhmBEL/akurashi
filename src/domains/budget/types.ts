export type FixedChargesStatus = "rouge" | "orange";

export interface HomeBudgetGauge {
  categoryId: string;
  label: string;
  spentAmount: number; // minor units
  targetAmount: number; // minor units
  pct: number; // 0-100, clamped
}

export interface HomeBudgetSummary {
  fixedChargesStatus: FixedChargesStatus;
  gauges: HomeBudgetGauge[];
}

export const BUDGET_CATEGORY_TYPES = [
  "fixe_fixe",
  "fixe_variable",
  "variable_prevue",
  "variable_imprevue",
] as const;
export type BudgetFinancialType = (typeof BUDGET_CATEGORY_TYPES)[number];
