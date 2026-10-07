import { parseDateString, toDateString } from "@/shared/lib/date";

// Période budgétaire : du jour de reset (1 à 28) à la veille du suivant.
// Toutes les dates sont des chaînes « YYYY-MM-DD » (jour local), la fin est exclue.

export interface BudgetPeriod {
  start: string;
  nextStart: string;
}

const atDay = (year: number, month: number, day: number) => toDateString(new Date(year, month, day));

export function periodBounds(date: Date, resetDay: number): BudgetPeriod {
  const startsThisMonth = date.getDate() >= resetDay;
  const first = new Date(date.getFullYear(), date.getMonth() + (startsThisMonth ? 0 : -1), resetDay);
  return {
    start: toDateString(first),
    nextStart: atDay(first.getFullYear(), first.getMonth() + 1, resetDay),
  };
}

// Période décalée de `months` mois (négatif = passé) à partir du début d'une période.
export function shiftPeriod(periodStart: string, months: number): BudgetPeriod {
  const start = parseDateString(periodStart);
  return {
    start: atDay(start.getFullYear(), start.getMonth() + months, start.getDate()),
    nextStart: atDay(start.getFullYear(), start.getMonth() + months + 1, start.getDate()),
  };
}

// Nombre de mois entre deux débuts de période (b - a).
export function monthsBetween(a: string, b: string): number {
  const from = parseDateString(a);
  const to = parseDateString(b);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// Date de prélèvement tombant dans la période : le jour `debitDay` à partir du
// début de période (même mois si le jour est ≥ au jour de reset, sinon le mois suivant).
export function debitDateInPeriod(periodStart: string, debitDay: number): string {
  const start = parseDateString(periodStart);
  const sameMonth = debitDay >= start.getDate();
  return atDay(start.getFullYear(), start.getMonth() + (sameMonth ? 0 : 1), debitDay);
}

// Jours restants avant le prochain reset (au moins 1).
export function daysUntil(date: string, from: string): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((parseDateString(date).getTime() - parseDateString(from).getTime()) / dayMs));
}
