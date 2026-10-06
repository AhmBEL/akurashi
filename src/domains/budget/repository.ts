import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore, NewRow } from "@/shared/data/types";
import { startOfWeek, toDateString } from "@/shared/lib/date";
import { computeHomeBudgetSummary } from "./services/computeHomeBudgetSummary";
import { VARIABLE_AMOUNT_CHARGES } from "./defaults";
import type { HomeBudgetSummary } from "./types";

// Le seul endroit autorisé à lire/écrire `budget_categories`, `budget_lines`
// et `budget_line_cycles`, toujours via le DataStore.

type CategoryRow = Database["public"]["Tables"]["budget_categories"]["Row"];
type LineRow = Database["public"]["Tables"]["budget_lines"]["Row"];
type CycleRow = Database["public"]["Tables"]["budget_line_cycles"]["Row"];

export type TargetPeriod = CategoryRow["target_period"];

const firstOfMonth = (date: Date) => toDateString(new Date(date.getFullYear(), date.getMonth(), 1));
const firstOfNextMonth = (date: Date) => toDateString(new Date(date.getFullYear(), date.getMonth() + 1, 1));

export async function getHomeBudgetSummary(store: DataStore, familyId: string): Promise<HomeBudgetSummary> {
  const [categories, lines, cycles] = await Promise.all([
    store.list<CategoryRow>("budget_categories", { family_id: familyId }),
    store.list<LineRow>("budget_lines", { family_id: familyId }),
    store.list<CycleRow>("budget_line_cycles"),
  ]);

  const now = new Date();
  const monday = startOfWeek(now);

  return computeHomeBudgetSummary({
    categories,
    lines,
    cycles,
    monthStart: firstOfMonth(now),
    nextMonthStart: firstOfNextMonth(now),
    weekStart: toDateString(monday),
    nextWeekStart: toDateString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7)),
  });
}

export interface AddExpenseInput {
  familyId: string;
  categoryId: string;
  amountMinorUnits: number;
  responsibleId: string | null;
  spentOn: string;
  note: string | null;
}

export async function addExpense(store: DataStore, input: AddExpenseInput): Promise<void> {
  await store.create<LineRow>("budget_lines", {
    family_id: input.familyId,
    category_id: input.categoryId,
    financial_type: "variable_prevue",
    amount: input.amountMinorUnits,
    periodicity: null,
    spent_on: input.spentOn,
    responsible_id: input.responsibleId,
    visibility: "family",
    validation_status: "validee",
    proposed_by: null,
    task_id: null,
    receipt_photo_url: null,
    note: input.note,
  } satisfies NewRow<LineRow>);
}

export async function getCategoryOptions(store: DataStore, familyId: string): Promise<Array<{ id: string; name: string }>> {
  const categories = await store.list<CategoryRow>("budget_categories", { family_id: familyId });
  return categories.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export interface CreateCategoryInput {
  familyId: string;
  name: string;
  showOnHome: boolean;
  targetAmount: number | null;
  targetPeriod: TargetPeriod;
}

export async function createBudgetCategory(store: DataStore, input: CreateCategoryInput): Promise<string> {
  const row = await store.create<CategoryRow>("budget_categories", {
    family_id: input.familyId,
    name: input.name,
    target_amount: input.targetAmount,
    target_period: input.targetPeriod,
    show_on_home: input.showOnHome,
  } satisfies NewRow<CategoryRow>);
  return row.id;
}

export interface CreateFixedChargeInput {
  familyId: string;
  name: string;
  amountMinorUnits: number | null;
  responsibleId: string | null;
}

// Une charge fixe = sa catégorie + sa ligne mensuelle + le cycle du mois en
// « non payé » (rouge tant qu'elle n'est pas cochée).
export async function createFixedCharge(store: DataStore, input: CreateFixedChargeInput): Promise<void> {
  const categoryId = await createBudgetCategory(store, {
    familyId: input.familyId,
    name: input.name,
    showOnHome: false,
    targetAmount: null,
    targetPeriod: "month",
  });

  const line = await store.create<LineRow>("budget_lines", {
    family_id: input.familyId,
    category_id: categoryId,
    financial_type: VARIABLE_AMOUNT_CHARGES.includes(input.name) ? "fixe_variable" : "fixe_fixe",
    amount: input.amountMinorUnits ?? 0,
    periodicity: "mensuel",
    spent_on: toDateString(new Date()),
    responsible_id: input.responsibleId,
    visibility: "family",
    validation_status: "validee",
    proposed_by: null,
    task_id: null,
    receipt_photo_url: null,
    note: null,
  } satisfies NewRow<LineRow>);

  await store.create<CycleRow>("budget_line_cycles", {
    budget_line_id: line.id,
    period_month: firstOfMonth(new Date()),
    status: "non_paye",
    paid_at: null,
  } satisfies NewRow<CycleRow>);
}

export interface HomeCategory {
  id: string;
  name: string;
  targetAmount: number | null;
  targetPeriod: TargetPeriod;
}

// Catégories qui alimentent les jauges de l'accueil (plafond modifiable dans Réglages).
export async function getHomeCategories(store: DataStore, familyId: string): Promise<HomeCategory[]> {
  const categories = await store.list<CategoryRow>("budget_categories", { family_id: familyId });
  return categories
    .filter((category) => category.show_on_home)
    .map((category) => ({
      id: category.id,
      name: category.name,
      targetAmount: category.target_amount,
      targetPeriod: category.target_period,
    }));
}

export async function updateBudgetTarget(
  store: DataStore,
  categoryId: string,
  targetAmount: number | null,
  targetPeriod: TargetPeriod
): Promise<void> {
  await store.update<CategoryRow>("budget_categories", categoryId, {
    target_amount: targetAmount,
    target_period: targetPeriod,
  });
}
