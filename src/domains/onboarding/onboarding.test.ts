import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createLocalStore } from "@/shared/data/localStore";
import type { BaseRow } from "@/shared/data/types";
import { loadFamilyState } from "@/domains/family/repository";
import { normalizeOnboarding, type OnboardingDraft } from "./answers";
import { createFamilyFromOnboarding } from "./createFamily";

let counter = 0;
const freshStore = () => createLocalStore(`onboarding-test-${counter++}`);

type Row = BaseRow & Record<string, unknown>;
const rows = (store: ReturnType<typeof freshStore>, table: string) => store.list<Row>(table);

// Parcours B : tout est renseigné, à l'opposé du parcours « tout sauté ».
const fullDraft: OnboardingDraft = {
  familyName: "  Les Dupont ",
  parentName: "Alex",
  parentColor: "ardoise",
  currency: "EUR",
  otherParent: "invite_now",
  children: [
    { name: "Lou", age: 4 },
    { name: "Sam", age: 14, autonomous: true, rdvPrive: true, reward: true, compensation: "financiere_libre", rewardType: "badge", theme: "ocean" },
  ],
  budgetEnabled: true,
  budgetResetDay: 5,
  fixedCharges: [{ name: "Loyer / crédit", amount: 900 }, { name: "Électricité" }, { name: "Mobile", amount: 15.5 }],
  coursesTarget: 120,
  loisirsTarget: null,
  modules: { sujets: false, courses: false },
  taskCategories: ["Santé", "École", "N'importe quoi"],
  securityLevel: "accueil_protege",
  recomposedFamily: true,
};

describe("normalizeOnboarding", () => {
  it("applique les valeurs par défaut quand tout est sauté", () => {
    const answers = normalizeOnboarding({});

    expect(answers.familyName).toBe("Ma famille");
    expect(answers.parentName).toBe("Parent 1");
    expect(answers.parentColor).toBe("sauge");
    expect(answers.currency).toBe("MUR");
    expect(answers.securityLevel).toBe("libre");
    expect(answers.children).toEqual([]);
    expect(answers.fixedCharges).toEqual([]);
    expect(answers.settings).toMatchObject({
      otherParent: "later",
      budgetEnabled: true,
      budgetResetDay: 1,
      recomposedFamily: false,
      modules: { sujets: true, courses: true, documents: true, contacts: true, agenda: true },
    });
    expect(answers.taskCategoryNames).toHaveLength(6);
  });

  it("nettoie les réponses : espaces, montants en centimes, catégories inconnues, enfants", () => {
    const answers = normalizeOnboarding(fullDraft);

    expect(answers.familyName).toBe("Les Dupont");
    expect(answers.fixedCharges).toEqual([
      { name: "Loyer / crédit", amountMinorUnits: 90000 },
      { name: "Électricité", amountMinorUnits: null },
      { name: "Mobile", amountMinorUnits: 1550 },
    ]);
    expect(answers.coursesTargetMinorUnits).toBe(12000);
    expect(answers.taskCategoryNames).toEqual(["Santé", "École"]);
    expect(answers.children[0]).toMatchObject({ name: "Lou", accessStatus: "managed", rdvPriveAutorise: false });
    expect(answers.children[0].reward.type).toBe("aucun");
    expect(answers.children[1]).toMatchObject({ accessStatus: "invited_pending", rdvPriveAutorise: true });
    expect(answers.children[1].reward).toEqual({ type: "badge", compensationType: "financiere_libre", visualTheme: "ocean" });
  });

  it("budget désactivé : ni charges ni plafonds ; rdv privé impossible pour un enfant accompagné", () => {
    const answers = normalizeOnboarding({
      budgetEnabled: false,
      fixedCharges: [{ name: "Mobile", amount: 10 }],
      coursesTarget: 50,
      children: [{ autonomous: false, rdvPrive: true }],
    });

    expect(answers.fixedCharges).toEqual([]);
    expect(answers.coursesTargetMinorUnits).toBeNull();
    expect(answers.children[0]).toMatchObject({ name: "Enfant 1", rdvPriveAutorise: false });
  });

  it("suggère le système de récompense selon l'âge sans l'imposer", () => {
    const answers = normalizeOnboarding({
      children: [
        { age: 5, reward: true },
        { age: 9, reward: true },
        { age: 15, reward: true },
        { age: 5, reward: true, rewardType: "compteur" },
      ],
    });
    expect(answers.children.map((child) => child.reward.type)).toEqual(["etoile", "badge", "note", "compteur"]);
  });
});

describe("createFamilyFromOnboarding", () => {
  it("parcours A (tout sauté) : une famille minimale avec les défauts", async () => {
    const store = freshStore();
    expect((await createFamilyFromOnboarding(store, {}, null)).error).toBeNull();

    const [family] = await rows(store, "families");
    expect(family).toMatchObject({ name: "Ma famille", currency: "MUR", security_level: "libre" });
    expect(await rows(store, "family_members")).toHaveLength(1);
    expect(await rows(store, "reward_systems")).toHaveLength(0);
    expect(await rows(store, "task_categories")).toHaveLength(6);
    expect((await rows(store, "budget_categories")).map((category) => category.name)).toEqual(["Courses", "Loisirs"]);
    expect(await rows(store, "budget_lines")).toHaveLength(0);

    const state = await loadFamilyState(store);
    expect(state?.members.some((member) => member.role === "enfant")).toBe(false);
  });

  it("parcours B (tout renseigné) : une app visiblement différente", async () => {
    const store = freshStore();
    expect((await createFamilyFromOnboarding(store, fullDraft, null)).error).toBeNull();

    const [family] = await rows(store, "families");
    expect(family).toMatchObject({ name: "Les Dupont", currency: "EUR", security_level: "accueil_protege" });
    const settings = family.settings as { inviteCode: string; modules: Record<string, boolean>; budgetResetDay: number; recomposedFamily: boolean };
    expect(settings.inviteCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(settings.modules).toMatchObject({ sujets: false, courses: false, documents: true });
    expect(settings).toMatchObject({ budgetResetDay: 5, recomposedFamily: true });

    const members = await rows(store, "family_members");
    expect(members.map((member) => `${member.role}:${member.name}:${member.access_status}`)).toEqual([
      "parent:Alex:null",
      "enfant:Lou:managed",
      "enfant:Sam:invited_pending",
    ]);
    expect(members[0].signature_color).toBe("ardoise");

    const rewards = await rows(store, "reward_systems");
    expect(rewards.map((reward) => reward.type).sort()).toEqual(["aucun", "badge"]);
    expect(rewards.find((reward) => reward.type === "badge")).toMatchObject({ visual_theme: "ocean", compensation_type: "financiere_libre" });

    expect(await rows(store, "task_categories")).toHaveLength(2);

    const categories = await rows(store, "budget_categories");
    expect(categories).toHaveLength(2 + 3);
    expect(categories.find((category) => category.name === "Courses")).toMatchObject({ target_amount: 12000, target_period: "week", show_on_home: true });
    expect(categories.find((category) => category.name === "Loisirs")).toMatchObject({ target_amount: null, target_period: "month" });

    const lines = await rows(store, "budget_lines");
    expect(lines.map((line) => line.financial_type).sort()).toEqual(["fixe_fixe", "fixe_fixe", "fixe_variable"]);
    const cycles = await rows(store, "budget_line_cycles");
    expect(cycles).toHaveLength(3);
    expect(cycles.every((cycle) => cycle.status === "non_paye")).toBe(true);
  });

  it("budget désactivé : aucune donnée budget n'est créée", async () => {
    const store = freshStore();
    await createFamilyFromOnboarding(store, { budgetEnabled: false, fixedCharges: [{ name: "Mobile" }] }, null);

    expect(await rows(store, "budget_categories")).toHaveLength(0);
    expect(await rows(store, "budget_lines")).toHaveLength(0);
    const state = await loadFamilyState(store);
    expect(state?.family.settings.budgetEnabled).toBe(false);
  });
});
