import { describe, expect, it } from "vitest";
import { computeFixedChargesStatus } from "./computeFixedChargesStatus";
import { computeHomeBudgetSummary, type SummaryInput } from "./computeHomeBudgetSummary";

const base: SummaryInput = {
  categories: [
    { id: "courses", name: "Courses", monthly_target_amount: 10000, show_on_home: true },
    { id: "loisirs", name: "Loisirs", monthly_target_amount: null, show_on_home: true },
    { id: "logement", name: "Logement", monthly_target_amount: null, show_on_home: false },
  ],
  lines: [],
  cycles: [],
  monthStart: "2026-10-01",
  nextMonthStart: "2026-11-01",
};

describe("computeFixedChargesStatus", () => {
  it("rouge si rien n'est payé, orange dès qu'une charge l'est", () => {
    expect(computeFixedChargesStatus([])).toBe("rouge");
    expect(computeFixedChargesStatus(["non_paye", "non_paye"])).toBe("rouge");
    expect(computeFixedChargesStatus(["non_paye", "paye"])).toBe("orange");
  });
});

describe("computeHomeBudgetSummary", () => {
  it("n'affiche que les catégories de l'accueil, % plafonné à 100, 0 sans plafond", () => {
    const summary = computeHomeBudgetSummary({
      ...base,
      lines: [
        { id: "l1", category_id: "courses", financial_type: "variable_prevue", amount: 4000, spent_on: "2026-10-03" },
        { id: "l2", category_id: "courses", financial_type: "variable_prevue", amount: 9000, spent_on: "2026-10-20" },
        { id: "l3", category_id: "loisirs", financial_type: "variable_prevue", amount: 500, spent_on: "2026-10-05" },
      ],
    });

    expect(summary.gauges.map((gauge) => gauge.label)).toEqual(["Courses", "Loisirs"]);
    expect(summary.gauges[0]).toMatchObject({ spentAmount: 13000, targetAmount: 10000, pct: 100 });
    expect(summary.gauges[1]).toMatchObject({ spentAmount: 500, targetAmount: 0, pct: 0 });
  });

  it("ignore les dépenses des autres mois", () => {
    const summary = computeHomeBudgetSummary({
      ...base,
      lines: [
        { id: "l1", category_id: "courses", financial_type: "variable_prevue", amount: 3000, spent_on: "2026-09-30" },
        { id: "l2", category_id: "courses", financial_type: "variable_prevue", amount: 2500, spent_on: "2026-10-01" },
        { id: "l3", category_id: "courses", financial_type: "variable_prevue", amount: 700, spent_on: "2026-11-01" },
      ],
    });
    expect(summary.gauges[0].spentAmount).toBe(2500);
    expect(summary.gauges[0].pct).toBe(25);
  });

  it("statut des charges fixes : seul le cycle du mois courant d'une charge fixe compte", () => {
    const fixed = { id: "rent", category_id: "logement", financial_type: "fixe_fixe", amount: 90000, spent_on: "2026-10-01" };
    const variable = { id: "snack", category_id: "courses", financial_type: "variable_prevue", amount: 300, spent_on: "2026-10-02" };

    const paidLastMonth = computeHomeBudgetSummary({
      ...base,
      lines: [fixed],
      cycles: [{ budget_line_id: "rent", period_month: "2026-09-01", status: "paye" }],
    });
    expect(paidLastMonth.fixedChargesStatus).toBe("rouge");

    const paidOnVariableLine = computeHomeBudgetSummary({
      ...base,
      lines: [fixed, variable],
      cycles: [{ budget_line_id: "snack", period_month: "2026-10-01", status: "paye" }],
    });
    expect(paidOnVariableLine.fixedChargesStatus).toBe("rouge");

    const paidThisMonth = computeHomeBudgetSummary({
      ...base,
      lines: [fixed],
      cycles: [{ budget_line_id: "rent", period_month: "2026-10-01", status: "paye" }],
    });
    expect(paidThisMonth.fixedChargesStatus).toBe("orange");
  });
});
