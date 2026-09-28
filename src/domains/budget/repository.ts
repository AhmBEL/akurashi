import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/lib/supabase/database.types";
import type { HomeBudgetSummary, BudgetFinancialType } from "./types";
import { computeFixedChargesStatus } from "./services/computeFixedChargesStatus";
import { toDateString } from "@/shared/lib/date";
import { isMockMode } from "@/shared/lib/mockMode";
import { MOCK_BUDGET_CATEGORIES, MOCK_BUDGET_SUMMARY } from "@/shared/lib/mockFixtures";

type Client = SupabaseClient<Database>;

const FIXED_CHARGE_TYPES: BudgetFinancialType[] = ["fixe_fixe", "fixe_variable"];

function firstOfMonth(date = new Date()): string {
  return toDateString(new Date(date.getFullYear(), date.getMonth(), 1));
}

function firstOfNextMonth(date = new Date()): string {
  return toDateString(new Date(date.getFullYear(), date.getMonth() + 1, 1));
}

// The only place in the app allowed to read/write `budget_categories`,
// `budget_lines` and `budget_line_cycles` directly.

export async function getHomeBudgetSummary(supabase: Client, familyId: string): Promise<HomeBudgetSummary> {
  if (isMockMode()) return MOCK_BUDGET_SUMMARY;

  const monthStart = firstOfMonth();
  const nextMonthStart = firstOfNextMonth();

  const { data: fixedLines } = await supabase
    .from("budget_lines")
    .select("id")
    .eq("family_id", familyId)
    .in("financial_type", FIXED_CHARGE_TYPES);

  const fixedLineIds = (fixedLines ?? []).map((l) => l.id);

  let cycleStatuses: Array<"paye" | "non_paye"> = [];
  if (fixedLineIds.length > 0) {
    const { data: cycles } = await supabase
      .from("budget_line_cycles")
      .select("status")
      .eq("period_month", monthStart)
      .in("budget_line_id", fixedLineIds);
    cycleStatuses = (cycles ?? []).map((c) => c.status);
  }

  const { data: homeCategories } = await supabase
    .from("budget_categories")
    .select("id, name, monthly_target_amount")
    .eq("family_id", familyId)
    .eq("show_on_home", true);

  const categories = homeCategories ?? [];
  const categoryIds = categories.map((c) => c.id);

  let spendByCategory = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: monthLines } = await supabase
      .from("budget_lines")
      .select("category_id, amount")
      .eq("family_id", familyId)
      .in("category_id", categoryIds)
      .gte("spent_on", monthStart)
      .lt("spent_on", nextMonthStart);

    spendByCategory = (monthLines ?? []).reduce((map, line) => {
      map.set(line.category_id, (map.get(line.category_id) ?? 0) + line.amount);
      return map;
    }, new Map<string, number>());
  }

  const gauges = categories.map((cat) => {
    const spent = spendByCategory.get(cat.id) ?? 0;
    const target = cat.monthly_target_amount ?? 0;
    const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
    return { categoryId: cat.id, label: cat.name, spentAmount: spent, targetAmount: target, pct };
  });

  return {
    fixedChargesStatus: computeFixedChargesStatus(cycleStatuses),
    gauges,
  };
}

export interface AddExpenseInput {
  familyId: string;
  categoryId: string;
  amountMinorUnits: number;
  responsibleId: string | null;
  spentOn: string;
  note: string | null;
}

export async function addExpense(supabase: Client, input: AddExpenseInput): Promise<{ error: string | null }> {
  if (isMockMode()) return { error: null };

  const { error } = await supabase.from("budget_lines").insert({
    family_id: input.familyId,
    category_id: input.categoryId,
    financial_type: "variable_prevue",
    amount: input.amountMinorUnits,
    responsible_id: input.responsibleId,
    spent_on: input.spentOn,
    note: input.note,
    validation_status: "validee",
  });

  return { error: error?.message ?? null };
}

export async function getHomeCategoryOptions(supabase: Client, familyId: string) {
  if (isMockMode()) return MOCK_BUDGET_CATEGORIES;

  const { data } = await supabase
    .from("budget_categories")
    .select("id, name")
    .eq("family_id", familyId)
    .order("name");
  return data ?? [];
}
