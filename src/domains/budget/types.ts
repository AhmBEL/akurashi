export type FixedChargesStatus = "rouge" | "orange";
// Statut du mois sur l'écran Budget : l'accueil ne montre que rouge / orange.
export type MonthStatus = "rouge" | "orange" | "vert";

export const BUDGET_CATEGORY_TYPES = [
  "fixe_fixe",
  "fixe_variable",
  "variable_prevue",
  "variable_imprevue",
] as const;
export type BudgetFinancialType = (typeof BUDGET_CATEGORY_TYPES)[number];

export type Periodicity = "mensuel" | "trimestriel" | "annuel";
export type ValidationStatus = "proposee" | "validee" | "ajustee" | "refusee";

export interface HomeBudgetGauge {
  categoryId: string;
  label: string;
  spentAmount: number; // minor units
  targetAmount: number; // minor units
  pct: number; // 0-100, clamped
}

export interface HomeBudgetSummary {
  // null : aucune charge fixe due cette période (rien à signaler).
  fixedChargesStatus: FixedChargesStatus | null;
  gauges: HomeBudgetGauge[];
}

// Lignes telles que lues en base, réduites à ce que les règles pures utilisent.
export interface RuleCategory {
  id: string;
  name: string;
  target_amount: number | null;
  target_period: "week" | "month";
  show_on_home: boolean;
}

export interface RuleLine {
  id: string;
  category_id: string;
  financial_type: BudgetFinancialType | string;
  amount: number;
  periodicity: Periodicity | null;
  spent_on: string;
  validation_status: ValidationStatus;
  is_direct_debit?: boolean;
  debit_day?: number | null;
}

export interface RuleCycle {
  budget_line_id: string;
  period_month: string;
  status: "paye" | "non_paye";
  amount?: number | null;
}

// « payee » : cochée ou prélevée ; « a_venir » : prélèvement pas encore passé ; « a_faire » : à cocher.
export type ChargeState = "payee" | "a_venir" | "a_faire";

export interface ChargeView {
  lineId: string;
  categoryId: string;
  financialType: "fixe_fixe" | "fixe_variable";
  periodicity: Periodicity;
  amount: number; // montant de la période (cycle) sinon montant habituel
  amountSet: boolean; // faux : montant variable pas encore saisi cette période
  isDirectDebit: boolean;
  debitDay: number | null;
  debitDate: string | null;
  state: ChargeState;
  paid: boolean;
  autoPaid: boolean; // prélèvement dont la date est passée (validé par la règle, pas à la main)
  cyclePaid: boolean; // le cycle de la période est déjà enregistré « payé »
}
