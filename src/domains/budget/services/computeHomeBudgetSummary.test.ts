import { describe, expect, it } from "vitest";
import { computeFixedChargesStatus } from "./computeFixedChargesStatus";
import { computeHomeBudgetSummary, type SummaryInput, type SummaryLine } from "./computeHomeBudgetSummary";

// Octobre 2026 : la semaine courante va du lundi 12 au lundi 19 (exclu).
const base: SummaryInput = {
  categories: [
    { id: "courses", name: "Courses", target_amount: 10000, target_period: "month", show_on_home: true },
    { id: "loisirs", name: "Loisirs", target_amount: null, target_period: "month", show_on_home: true },
    { id: "logement", name: "Logement", target_amount: null, target_period: "month", show_on_home: false },
  ],
  lines: [],
  cycles: [],
  resetDay: 1,
  today: "2026-10-14",
  periodStart: "2026-10-01",
  nextPeriodStart: "2026-11-01",
  weekStart: "2026-10-12",
  nextWeekStart: "2026-10-19",
};

const line = (id: string, category_id: string, amount: number, spent_on: string, financial_type = "variable_prevue"): SummaryLine => ({
  id,
  category_id,
  financial_type,
  amount,
  periodicity: financial_type.startsWith("fixe") ? "mensuel" : null,
  spent_on,
  validation_status: "validee",
});

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
      lines: [line("l1", "courses", 4000, "2026-10-03"), line("l2", "courses", 9000, "2026-10-20"), line("l3", "loisirs", 500, "2026-10-05")],
    });

    expect(summary.gauges.map((gauge) => gauge.label)).toEqual(["Courses", "Loisirs"]);
    expect(summary.gauges[0]).toMatchObject({ spentAmount: 13000, targetAmount: 10000, pct: 100 });
    expect(summary.gauges[1]).toMatchObject({ spentAmount: 500, targetAmount: 0, pct: 0 });
  });

  it("ignore les dépenses des autres mois", () => {
    const summary = computeHomeBudgetSummary({
      ...base,
      lines: [line("l1", "courses", 3000, "2026-09-30"), line("l2", "courses", 2500, "2026-10-01"), line("l3", "courses", 700, "2026-11-01")],
    });
    expect(summary.gauges[0].spentAmount).toBe(2500);
    expect(summary.gauges[0].pct).toBe(25);
  });

  it("une jauge hebdomadaire ne compte que la semaine courante", () => {
    const summary = computeHomeBudgetSummary({
      ...base,
      categories: [{ id: "courses", name: "Courses", target_amount: 12000, target_period: "week", show_on_home: true }],
      lines: [
        line("l1", "courses", 5000, "2026-10-11"),
        line("l2", "courses", 3000, "2026-10-12"),
        line("l3", "courses", 3000, "2026-10-18"),
        line("l4", "courses", 9999, "2026-10-19"),
      ],
    });
    expect(summary.gauges[0]).toMatchObject({ spentAmount: 6000, pct: 50 });
  });

  it("statut des charges fixes : seul le cycle du mois courant d'une charge fixe compte", () => {
    const fixed = line("rent", "logement", 90000, "2026-10-01", "fixe_fixe");
    const variable = line("snack", "courses", 300, "2026-10-02");

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

  it("seules les dépenses validées ou ajustées comptent dans les jauges", () => {
    const proposed: SummaryLine = { ...line("p", "courses", 2000, "2026-10-04"), validation_status: "proposee" };
    const refused: SummaryLine = { ...line("r", "courses", 3000, "2026-10-05"), validation_status: "refusee" };
    const adjusted: SummaryLine = { ...line("a", "courses", 1500, "2026-10-06"), validation_status: "ajustee" };
    const summary = computeHomeBudgetSummary({ ...base, lines: [line("v", "courses", 500, "2026-10-03"), proposed, refused, adjusted] });
    expect(summary.gauges[0].spentAmount).toBe(2000);
  });

  it("la jauge mensuelle suit le jour de reset, pas le 1er du mois", () => {
    const summary = computeHomeBudgetSummary({
      ...base,
      resetDay: 5,
      today: "2026-10-14",
      periodStart: "2026-10-05",
      nextPeriodStart: "2026-11-05",
      lines: [line("old", "courses", 4000, "2026-10-04"), line("new", "courses", 1000, "2026-10-05")],
    });
    expect(summary.gauges[0].spentAmount).toBe(1000);
  });

  it("accueil : rien à signaler sans charge due, orange quand tout est réglé (jamais vert)", () => {
    expect(computeHomeBudgetSummary(base).fixedChargesStatus).toBeNull();
    const allPaid = computeHomeBudgetSummary({
      ...base,
      lines: [line("rent", "logement", 90000, "2026-10-01", "fixe_fixe")],
      cycles: [{ budget_line_id: "rent", period_month: "2026-10-01", status: "paye" }],
    });
    expect(allPaid.fixedChargesStatus).toBe("orange");
  });
});
