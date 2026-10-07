import { parseDateString } from "@/shared/lib/date";
import type { ChargeState, ChargeView, MonthStatus, Periodicity, RuleCycle, RuleLine } from "../types";
import { debitDateInPeriod, monthsBetween, periodBounds } from "./period";

const FIXED_TYPES = ["fixe_fixe", "fixe_variable"] as const;

export const isFixedLine = (line: RuleLine): boolean => (FIXED_TYPES as readonly string[]).includes(line.financial_type);

// Une charge est « due » dans une période selon sa périodicité, comptée depuis
// la période où elle a été créée : mensuelle toujours, trimestrielle tous les
// 3 mois, annuelle tous les 12.
export function isChargeDue(periodicity: Periodicity, createdPeriodStart: string, periodStart: string): boolean {
  const elapsed = monthsBetween(createdPeriodStart, periodStart);
  if (elapsed < 0) return false;
  if (periodicity === "trimestriel") return elapsed % 3 === 0;
  if (periodicity === "annuel") return elapsed % 12 === 0;
  return true;
}

interface ChargeStateInput {
  manuallyPaid: boolean;
  isDirectDebit: boolean;
  debitDate: string | null;
  today: string;
}

// Règle des prélèvements : tant que le jour de prélèvement n'est pas arrivé la
// charge reste non faite (les 1er, 2, 3, 4…) ; dès ce jour, elle est validée seule.
export function chargeState({ manuallyPaid, isDirectDebit, debitDate, today }: ChargeStateInput): ChargeState {
  if (manuallyPaid) return "payee";
  if (isDirectDebit && debitDate) return debitDate <= today ? "payee" : "a_venir";
  return "a_faire";
}

interface BuildChargesInput {
  lines: RuleLine[];
  cycles: RuleCycle[];
  resetDay: number;
  periodStart: string;
  today: string;
}

// Les charges fixes dues dans la période, avec leur état.
export function buildCharges({ lines, cycles, resetDay, periodStart, today }: BuildChargesInput): ChargeView[] {
  const views: ChargeView[] = [];
  for (const line of lines) {
    if (!isFixedLine(line)) continue;
    const periodicity = line.periodicity ?? "mensuel";
    const createdPeriodStart = periodBounds(parseDateString(line.spent_on), resetDay).start;
    if (!isChargeDue(periodicity, createdPeriodStart, periodStart)) continue;

    const cycle = cycles.find((candidate) => candidate.budget_line_id === line.id && candidate.period_month === periodStart);
    const isDirectDebit = Boolean(line.is_direct_debit) && line.debit_day != null;
    const debitDate = isDirectDebit ? debitDateInPeriod(periodStart, line.debit_day as number) : null;
    const manuallyPaid = cycle?.status === "paye";
    const state = chargeState({ manuallyPaid, isDirectDebit, debitDate, today });
    const variable = line.financial_type === "fixe_variable";

    views.push({
      lineId: line.id,
      categoryId: line.category_id,
      financialType: variable ? "fixe_variable" : "fixe_fixe",
      periodicity,
      amount: cycle?.amount ?? line.amount,
      amountSet: !variable || cycle?.amount != null,
      isDirectDebit,
      debitDay: isDirectDebit ? (line.debit_day as number) : null,
      debitDate,
      state,
      paid: state === "payee",
      autoPaid: isDirectDebit && state === "payee",
      cyclePaid: manuallyPaid,
    });
  }
  return views;
}

// Rouge : rien de fait ; orange : en partie ; vert : tout est réglé.
// null quand aucune charge n'est due (rien à signaler).
export function monthStatus(charges: Pick<ChargeView, "paid">[]): MonthStatus | null {
  if (charges.length === 0) return null;
  const paid = charges.filter((charge) => charge.paid).length;
  if (paid === 0) return "rouge";
  return paid === charges.length ? "vert" : "orange";
}
