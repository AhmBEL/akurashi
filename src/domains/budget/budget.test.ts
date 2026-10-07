import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "@/shared/data/localStore";
import type { DataStore } from "@/shared/data/types";
import { createFamilyMember, loadFamilyState } from "@/domains/family/repository";
import { createFamilyFromOnboarding } from "@/domains/onboarding/createFamily";
import { listNotifications } from "@/domains/notifications/repository";
import {
  addExpense,
  createFixedCharge,
  getBudgetPage,
  getCategoryOptions,
  getHomeBudgetSummary,
  getHomeCategories,
  removeCharge,
  setChargeAmount,
  settleDirectDebits,
  toggleChargePaid,
  validateExpense,
} from "./repository";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

let counter = 0;
let store: DataStore;
let familyId: string;
let parent1: string;
let parent2: string | null;

async function setup(withSecondParent: boolean) {
  store = createLocalStore(`budget-test-${counter++}`);
  await createFamilyFromOnboarding(store, { parentName: "Alex", budgetResetDay: 5, loisirsTarget: 100 }, null);
  const state = (await loadFamilyState(store))!;
  familyId = state.family.id;
  parent1 = state.member.id;
  parent2 = null;
  if (withSecondParent) {
    parent2 = (
      await createFamilyMember(store, { familyId, name: "Sam", role: "parent", age: null, signatureColor: "prune", accessStatus: null, linkedAccountId: null })
    ).id;
  }
}

const charge = (name: string, extra: Partial<Parameters<typeof createFixedCharge>[1]> = {}) =>
  createFixedCharge(store, { familyId, name, amountMinorUnits: 3000, responsibleId: parent1, today: day(2026, 9, 10), ...extra });

const page = (today: Date, memberId = parent1) => getBudgetPage(store, familyId, memberId, today);
const lineIdOf = async (name: string) => (await page(day(2026, 9, 20))).fixedCharges.concat((await page(day(2026, 9, 20))).variableCharges).find((c) => c.name === name)!.lineId;

describe("jour de reset", () => {
  beforeEach(() => setup(false));

  it("au passage du reset, les charges repassent en rouge et les jauges à zéro ; cocher passe en orange", async () => {
    await charge("Loyer");
    await charge("Assurance");
    const [loisirs] = (await getHomeCategories(store, familyId)).filter((c) => c.name === "Loisirs");
    await addExpense(store, { familyId, actorId: parent1, categoryId: loisirs.id, amountMinorUnits: 4000, responsibleId: parent1, spentOn: "2026-09-15", note: null });

    const september = day(2026, 9, 20);
    expect((await page(september)).status).toBe("rouge");
    expect((await getHomeBudgetSummary(store, familyId, september)).fixedChargesStatus).toBe("rouge");

    const rent = await lineIdOf("Loyer");
    await toggleChargePaid(store, rent, "2026-09-05", true, september);
    expect((await page(september)).status).toBe("orange");
    expect((await getHomeBudgetSummary(store, familyId, september)).fixedChargesStatus).toBe("orange");
    expect((await page(september)).gauges.find((g) => g.label === "Loisirs")).toMatchObject({ spentAmount: 4000, pct: 40 });

    // Le 4 octobre on est encore dans la période commencée le 5 septembre.
    expect((await page(day(2026, 10, 4))).status).toBe("orange");

    const reset = await page(day(2026, 10, 5));
    expect(reset.periodStart).toBe("2026-10-05");
    expect(reset.status).toBe("rouge");
    expect((await getHomeBudgetSummary(store, familyId, day(2026, 10, 5))).fixedChargesStatus).toBe("rouge");
    expect(reset.gauges.find((g) => g.label === "Loisirs")).toMatchObject({ spentAmount: 0, pct: 0 });

    expect(reset.history[0]).toMatchObject({ start: "2026-09-05", status: "orange", paidCount: 1, dueCount: 2 });
    expect(reset.bilan?.message).toContain("1 charge sur 2 réglée");

    // Décocher repasse la charge à faire.
    await toggleChargePaid(store, rent, "2026-09-05", false, september);
    expect((await page(september)).status).toBe("rouge");
  });
});

describe("prélèvements automatiques", () => {
  beforeEach(() => setup(false));

  it("non fait avant le jour de prélèvement, validé automatiquement ensuite (idempotent)", async () => {
    await charge("Loyer");
    await charge("Mobile", { isDirectDebit: true, debitDay: 8 });
    const mobile = async (today: Date) => (await page(today)).fixedCharges.find((c) => c.name === "Mobile")!;

    expect(await mobile(day(2026, 10, 6))).toMatchObject({ state: "a_venir", debitDate: "2026-10-08", paid: false });
    expect((await page(day(2026, 10, 6))).status).toBe("rouge");
    expect(await settleDirectDebits(store, familyId, day(2026, 10, 6))).toBe(0);

    expect(await mobile(day(2026, 10, 8))).toMatchObject({ state: "payee", autoPaid: true });
    expect((await page(day(2026, 10, 8))).status).toBe("orange");
    expect((await getHomeBudgetSummary(store, familyId, day(2026, 10, 8))).fixedChargesStatus).toBe("orange");

    expect(await settleDirectDebits(store, familyId, day(2026, 10, 8))).toBe(1);
    const lineId = (await mobile(day(2026, 10, 8))).lineId;
    expect(await settleDirectDebits(store, familyId, day(2026, 10, 9))).toBe(0);
    const cycles = (await store.list<{ id: string; budget_line_id: string; status: string; period_month: string }>("budget_line_cycles")).filter((c) => c.budget_line_id === lineId && c.period_month === "2026-10-05");
    expect(cycles).toHaveLength(1);
    expect(cycles[0].status).toBe("paye");
  });

  it("jour de prélèvement obligatoire (1 à 28) quand la charge est un prélèvement", async () => {
    await expect(charge("Mobile", { isDirectDebit: true, debitDay: null })).rejects.toThrow("jour de prélèvement");
    await expect(charge("Internet", { isDirectDebit: true, debitDay: 31 })).rejects.toThrow("jour de prélèvement");
  });
});

describe("charges", () => {
  beforeEach(() => setup(false));

  it("montant variable saisi pour chaque période", async () => {
    await charge("Électricité", { amountMinorUnits: null });
    const power = (today: Date) => page(today).then((p) => p.variableCharges.find((c) => c.name === "Électricité")!);
    expect(await power(day(2026, 9, 20))).toMatchObject({ financialType: "fixe_variable", amountSet: false });

    const lineId = (await power(day(2026, 9, 20))).lineId;
    await setChargeAmount(store, lineId, "2026-09-05", 8400);
    expect(await power(day(2026, 9, 25))).toMatchObject({ amount: 8400, amountSet: true });
    expect(await power(day(2026, 10, 6))).toMatchObject({ amountSet: false });
  });

  it("une charge trimestrielle n'apparaît que les périodes où elle est due", async () => {
    await charge("Assurance habitation", { periodicity: "trimestriel" });
    const names = async (today: Date) => (await page(today)).fixedCharges.map((c) => c.name);
    expect(await names(day(2026, 9, 20))).toEqual(["Assurance habitation"]);
    expect(await names(day(2026, 10, 20))).toEqual([]);
    expect(await names(day(2026, 12, 20))).toEqual(["Assurance habitation"]);
  });

  it("refuse un doublon, supprime une charge avec sa catégorie ; les catégories de charges n'encombrent pas les dépenses", async () => {
    await charge("Loyer");
    await expect(charge("loyer")).rejects.toThrow("existe déjà");
    expect((await getCategoryOptions(store, familyId)).map((c) => c.name)).toEqual(["Courses", "Loisirs"]);

    await removeCharge(store, await lineIdOf("Loyer"));
    expect((await page(day(2026, 9, 20))).fixedCharges).toHaveLength(0);
    expect((await store.list<{ id: string; name: string }>("budget_categories", { family_id: familyId })).map((c) => c.name).sort()).toEqual(["Courses", "Loisirs"]);
  });
});

describe("dépense à valider", () => {
  beforeEach(() => setup(true));

  const propose = async (amount = 6000) => {
    const [loisirs] = (await getHomeCategories(store, familyId)).filter((c) => c.name === "Loisirs");
    const result = await addExpense(store, {
      familyId,
      actorId: parent1,
      categoryId: loisirs.id,
      amountMinorUnits: amount,
      responsibleId: parent1,
      spentOn: "2026-10-10",
      note: "Cinéma",
      requestValidation: true,
    });
    return result.id;
  };
  const spent = async () => (await page(day(2026, 10, 12))).gauges.find((g) => g.label === "Loisirs")!.spentAmount;

  it("proposée : l'autre parent est notifié et la jauge ne bouge pas", async () => {
    const id = await propose();
    expect(await spent()).toBe(0);
    const view = await page(day(2026, 10, 12), parent2!);
    expect(view.toValidate).toMatchObject([{ id, label: "Cinéma", amount: 6000, proposedByName: "Alex", status: "proposee" }]);
    expect(view.hasOtherParent).toBe(true);
    const [notification] = await listNotifications(store, parent2!);
    expect(notification).toMatchObject({ category: "depense_a_valider", body: "Cinéma" });
    expect(await listNotifications(store, parent1)).toHaveLength(0);
  });

  it("validée : compte dans la jauge, le proposeur est prévenu", async () => {
    const id = await propose();
    await validateExpense(store, { lineId: id, actorId: parent2!, decision: "validee" });
    expect(await spent()).toBe(6000);
    expect((await page(day(2026, 10, 12))).toValidate).toHaveLength(0);
    expect((await listNotifications(store, parent1))[0].title).toBe("Sam a validé « Cinéma »");
  });

  it("ajustée : le nouveau montant compte", async () => {
    const id = await propose();
    await expect(validateExpense(store, { lineId: id, actorId: parent2!, decision: "ajustee" })).rejects.toThrow("nouveau montant");
    await validateExpense(store, { lineId: id, actorId: parent2!, decision: "ajustee", amountMinorUnits: 4500 });
    expect(await spent()).toBe(4500);
    expect((await listNotifications(store, parent1))[0].title).toContain("ajusté");
  });

  it("refusée : ne compte pas et disparaît de la liste", async () => {
    const id = await propose();
    await validateExpense(store, { lineId: id, actorId: parent2!, decision: "refusee" });
    expect(await spent()).toBe(0);
    const view = await page(day(2026, 10, 12));
    expect([...view.toValidate, ...view.plannedExpenses, ...view.unplannedExpenses]).toHaveLength(0);
    expect((await listNotifications(store, parent1))[0].title).toBe("Sam a refusé « Cinéma »");
  });

  it("le proposeur ne peut pas valider sa propre dépense, ni deux fois", async () => {
    const id = await propose();
    await expect(validateExpense(store, { lineId: id, actorId: parent1, decision: "validee" })).rejects.toThrow("autre parent");
    await validateExpense(store, { lineId: id, actorId: parent2!, decision: "validee" });
    await expect(validateExpense(store, { lineId: id, actorId: parent2!, decision: "refusee" })).rejects.toThrow("plus à valider");
  });

  it("dépense imprévue avec une catégorie libre : créée une fois, réutilisée ensuite", async () => {
    const add = () =>
      addExpense(store, {
        familyId,
        actorId: parent1,
        categoryId: null,
        newCategoryName: "Vétérinaire",
        financialType: "variable_imprevue",
        amountMinorUnits: 5500,
        responsibleId: parent1,
        spentOn: "2026-10-11",
        note: null,
      });
    expect((await add()).status).toBe("validee");
    await add();
    const view = await page(day(2026, 10, 12));
    expect(view.unplannedExpenses).toHaveLength(2);
    expect(view.unplannedExpenses[0].categoryName).toBe("Vétérinaire");
    expect((await store.list<{ id: string; name: string }>("budget_categories", { family_id: familyId })).filter((c) => c.name === "Vétérinaire")).toHaveLength(1);
    await expect(addExpense(store, { familyId, actorId: parent1, categoryId: null, amountMinorUnits: 100, responsibleId: null, spentOn: "2026-10-11", note: null })).rejects.toThrow("catégorie");
  });
});

describe("sans autre parent", () => {
  beforeEach(() => setup(false));

  it("la dépense est validée directement, sans notification", async () => {
    const [loisirs] = (await getHomeCategories(store, familyId)).filter((c) => c.name === "Loisirs");
    const result = await addExpense(store, {
      familyId,
      actorId: parent1,
      categoryId: loisirs.id,
      amountMinorUnits: 2500,
      responsibleId: parent1,
      spentOn: "2026-10-10",
      note: null,
      requestValidation: true,
    });
    expect(result.status).toBe("validee");
    const view = await page(day(2026, 10, 12));
    expect(view.hasOtherParent).toBe(false);
    expect(view.gauges.find((g) => g.label === "Loisirs")?.spentAmount).toBe(2500);
    expect(await listNotifications(store, parent1)).toHaveLength(0);
  });
});
