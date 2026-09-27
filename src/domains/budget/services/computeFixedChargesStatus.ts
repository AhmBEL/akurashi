import type { FixedChargesStatus } from "../types";

/**
 * 04-ecrans-a-construire.md §2: "point de statut charges fixes (rouge/orange,
 * rien de plus)" — red when nothing has been processed this month, orange as
 * soon as at least one fixed charge has been marked paid. Never green here;
 * the per-line detail (with a 3rd, ok/green state) belongs to the budget
 * detail screen, not this summary.
 */
export function computeFixedChargesStatus(cycleStatuses: Array<"paye" | "non_paye">): FixedChargesStatus {
  const anyPaid = cycleStatuses.some((status) => status === "paye");
  return anyPaid ? "orange" : "rouge";
}
