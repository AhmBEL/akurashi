import { describe, expect, it } from "vitest";
import { buildCharges, chargeState, isChargeDue, monthStatus } from "./charges";
import { buildBilan, buildHistory } from "./history";
import { daysUntil, debitDateInPeriod, monthsBetween, periodBounds, shiftPeriod } from "./period";
import type { RuleCycle, RuleLine } from "../types";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("période budgétaire", () => {
  it("reset le 5 : avant le 5, on est encore dans la période du mois précédent", () => {
    expect(periodBounds(day(2026, 10, 4), 5)).toEqual({ start: "2026-09-05", nextStart: "2026-10-05" });
    expect(periodBounds(day(2026, 10, 5), 5)).toEqual({ start: "2026-10-05", nextStart: "2026-11-05" });
    expect(periodBounds(day(2026, 10, 31), 5)).toEqual({ start: "2026-10-05", nextStart: "2026-11-05" });
  });

  it("reset le 1er : la période est le mois calendaire", () => {
    expect(periodBounds(day(2026, 10, 14), 1)).toEqual({ start: "2026-10-01", nextStart: "2026-11-01" });
  });

  it("passage d'année dans les deux sens", () => {
    expect(periodBounds(day(2027, 1, 3), 10)).toEqual({ start: "2026-12-10", nextStart: "2027-01-10" });
    expect(periodBounds(day(2026, 12, 20), 10)).toEqual({ start: "2026-12-10", nextStart: "2027-01-10" });
    expect(shiftPeriod("2026-01-05", -1)).toEqual({ start: "2025-12-05", nextStart: "2026-01-05" });
  });

  it("mois entre deux périodes, jours restants", () => {
    expect(monthsBetween("2025-11-05", "2026-02-05")).toBe(3);
    expect(daysUntil("2026-11-05", "2026-10-31")).toBe(5);
  });

  it("date de prélèvement : même mois si le jour suit le reset, sinon le mois suivant", () => {
    expect(debitDateInPeriod("2026-10-01", 5)).toBe("2026-10-05");
    expect(debitDateInPeriod("2026-10-25", 5)).toBe("2026-11-05");
    expect(debitDateInPeriod("2026-10-25", 28)).toBe("2026-10-28");
  });
});

describe("périodicité", () => {
  it("mensuelle chaque période, trimestrielle tous les 3 mois, annuelle tous les 12", () => {
    expect(isChargeDue("mensuel", "2026-01-01", "2026-02-01")).toBe(true);
    expect(isChargeDue("trimestriel", "2026-01-01", "2026-02-01")).toBe(false);
    expect(isChargeDue("trimestriel", "2026-01-01", "2026-04-01")).toBe(true);
    expect(isChargeDue("annuel", "2026-01-01", "2026-07-01")).toBe(false);
    expect(isChargeDue("annuel", "2026-01-01", "2027-01-01")).toBe(true);
  });

  it("jamais due avant sa création", () => {
    expect(isChargeDue("mensuel", "2026-03-01", "2026-02-01")).toBe(false);
  });
});

describe("état d'une charge", () => {
  const debit = (today: string) => chargeState({ manuallyPaid: false, isDirectDebit: true, debitDate: "2026-10-05", today });

  it("prélèvement le 5 : non fait les 1er, 2, 3, 4 — validé automatiquement dès le 5", () => {
    for (const today of ["2026-10-01", "2026-10-02", "2026-10-04"]) expect(debit(today)).toBe("a_venir");
    expect(debit("2026-10-05")).toBe("payee");
    expect(debit("2026-10-20")).toBe("payee");
  });

  it("sans prélèvement : à faire tant qu'elle n'est pas cochée", () => {
    expect(chargeState({ manuallyPaid: false, isDirectDebit: false, debitDate: null, today: "2026-10-30" })).toBe("a_faire");
    expect(chargeState({ manuallyPaid: true, isDirectDebit: false, debitDate: null, today: "2026-10-01" })).toBe("payee");
  });
});

const line = (over: Partial<RuleLine> & { id: string }): RuleLine => ({
  category_id: `cat-${over.id}`,
  financial_type: "fixe_fixe",
  amount: 5000,
  periodicity: "mensuel",
  spent_on: "2026-08-10",
  validation_status: "validee",
  ...over,
});

describe("charges de la période et statut du mois", () => {
  const lines = [
    line({ id: "rent" }),
    line({ id: "mobile", is_direct_debit: true, debit_day: 5, amount: 2000 }),
    line({ id: "power", financial_type: "fixe_variable", amount: 0 }),
    line({ id: "insurance", periodicity: "trimestriel", spent_on: "2026-08-10" }),
  ];
  const build = (today: string, cycles: RuleCycle[] = [], periodStart = "2026-10-01") =>
    buildCharges({ lines, cycles, resetDay: 1, periodStart, today });

  it("ne garde que les charges dues (trimestrielle créée en août : due en août et novembre)", () => {
    expect(build("2026-10-02").map((c) => c.lineId).sort()).toEqual(["mobile", "power", "rent"]);
    expect(buildCharges({ lines, cycles: [], resetDay: 1, periodStart: "2026-11-01", today: "2026-11-02" }).map((c) => c.lineId)).toContain("insurance");
  });

  it("au passage du jour de reset, tout repasse en rouge (le prélèvement attend sa date)", () => {
    const paid: RuleCycle[] = [{ budget_line_id: "rent", period_month: "2026-10-01", status: "paye" }];
    expect(monthStatus(build("2026-10-20", paid))).toBe("orange");
    const next = buildCharges({ lines, cycles: paid, resetDay: 1, periodStart: "2026-11-01", today: "2026-11-01" });
    expect(monthStatus(next)).toBe("rouge");
    expect(next.find((c) => c.lineId === "mobile")?.state).toBe("a_venir");
  });

  it("le prélèvement se valide seul à sa date, ce qui fait passer le mois à orange", () => {
    expect(monthStatus(build("2026-10-04"))).toBe("rouge");
    const on5th = build("2026-10-05");
    expect(on5th.find((c) => c.lineId === "mobile")).toMatchObject({ state: "payee", autoPaid: true });
    expect(monthStatus(on5th)).toBe("orange");
  });

  it("vert quand tout est réglé, null sans charge", () => {
    const everything: RuleCycle[] = ["rent", "power"].map((id) => ({ budget_line_id: id, period_month: "2026-10-01", status: "paye" }));
    expect(monthStatus(build("2026-10-06", everything))).toBe("vert");
    expect(monthStatus([])).toBeNull();
  });

  it("montant variable : celui de la période, « à saisir » tant qu'il manque", () => {
    const power = (cycles: RuleCycle[]) => build("2026-10-10", cycles).find((c) => c.lineId === "power");
    expect(power([])).toMatchObject({ amountSet: false, amount: 0 });
    expect(power([{ budget_line_id: "power", period_month: "2026-10-01", status: "non_paye", amount: 8400 }])).toMatchObject({ amountSet: true, amount: 8400 });
  });
});

describe("historique et bilan", () => {
  const lines = [line({ id: "rent", spent_on: "2026-06-10" }), line({ id: "net", spent_on: "2026-06-10", is_direct_debit: true, debit_day: 3 })];
  const cycles: RuleCycle[] = [
    { budget_line_id: "rent", period_month: "2026-09-01", status: "paye" },
    { budget_line_id: "rent", period_month: "2026-08-01", status: "paye" },
  ];
  const history = buildHistory({ lines, cycles, resetDay: 1, currentPeriodStart: "2026-10-01", today: "2026-10-14" });

  it("statut de chaque période écoulée qui avait des charges, la plus récente d'abord", () => {
    expect(history.map((r) => [r.start, r.status])).toEqual([
      ["2026-09-01", "vert"],
      ["2026-08-01", "vert"],
      ["2026-07-01", "orange"],
      ["2026-06-01", "orange"],
    ]);
  });

  it("bilan encourageant, sans reproche", () => {
    expect(buildBilan(null, [])).toBeNull();
    expect(buildBilan(history[0], [{ name: "Loisirs", spent: 4000, target: 5000 }])?.title).toBe("Beau mois !");

    const partial = buildBilan(history[2], [{ name: "Loisirs", spent: 7000, target: 5000 }])!;
    expect(partial.message).toContain("1 charge sur 2 réglée");
    expect(partial.message).toContain("Loisirs a dépassé le plafond");
    expect(partial.suggestion).toContain("Loisirs");
  });
});
