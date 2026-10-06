import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore, NewRow } from "@/shared/data/types";
import { toDateString } from "@/shared/lib/date";
import { DEFAULT_BUDGET_CATEGORIES } from "./defaults";
import { computeHomeBudgetSummary } from "./services/computeHomeBudgetSummary";
import type { HomeBudgetSummary } from "./types";

// Le seul endroit autorisé à lire/écrire `budget_categories`, `budget_lines`
// et `budget_line_cycles`, toujours via le DataStore.

type CategoryRow = Database["public"]["Tables"]["budget_categories"]["Row"];
type LineRow = Database["public"]["Tables"]["budget_lines"]["Row"];
type CycleRow = Database["public"]["Tables"]["budget_line_cycles"]["Row"];

const firstOfMonth = (date = new Date()) => toDateString(new Date(date.getFullYear(), date.getMonth(), 1));
const firstOfNextMonth = (date = new Date()) => toDateString(new Date(date.getFullYear(), date.getMonth() + 1, 1));

export async function getHomeBudgetSummary(store: DataStore, familyId: string): Promise<HomeBudgetSummary> {
  const [categories, lines, cycles] = await Promise.all([
    store.list<CategoryRow>("budget_categories", { family_id: familyId }),
    store.list<LineRow>("budget_lines", { family_id: familyId }),
    store.list<CycleRow>("budget_line_cycles"),
  ]);

  return computeHomeBudgetSummary({
    categories,
    lines,
    cycles,
    monthStart: firstOfMonth(),
    nextMonthStart: firstOfNextMonth(),
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

export async function seedDefaultCategories(store: DataStore, familyId: string): Promise<void> {
  for (const category of DEFAULT_BUDGET_CATEGORIES) {
    await store.create<CategoryRow>("budget_categories", {
      family_id: familyId,
      name: category.name,
      monthly_target_amount: null,
      show_on_home: category.showOnHome,
    } satisfies NewRow<CategoryRow>);
  }
}
