"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import {
  getBudgetPage,
  getCategoryOptions,
  getHomeBudgetSummary,
  getHomeCategories,
  type BudgetPageData,
  type HomeCategory,
} from "./repository";
import type { HomeBudgetSummary } from "./types";

const BUDGET_TABLES = ["budget_categories", "budget_lines", "budget_line_cycles", "families"];

export function useHomeBudgetSummary(familyId: string): HomeBudgetSummary | undefined {
  return useStoreQuery(`home-budget:${familyId}`, (store) => getHomeBudgetSummary(store, familyId), BUDGET_TABLES);
}

export function useBudgetPage(familyId: string, memberId: string): BudgetPageData | undefined {
  return useStoreQuery(`budget-page:${familyId}:${memberId}`, (store) => getBudgetPage(store, familyId, memberId), [
    ...BUDGET_TABLES,
    "family_members",
  ]);
}

export function useCategoryOptions(familyId: string): Array<{ id: string; name: string }> | undefined {
  return useStoreQuery(`budget-categories:${familyId}`, (store) => getCategoryOptions(store, familyId), [
    "budget_categories",
    "budget_lines",
  ]);
}

export function useHomeCategories(familyId: string): HomeCategory[] | undefined {
  return useStoreQuery(`home-categories:${familyId}`, (store) => getHomeCategories(store, familyId), ["budget_categories"]);
}
