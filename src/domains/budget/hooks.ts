"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getCategoryOptions, getHomeBudgetSummary, getHomeCategories, type HomeCategory } from "./repository";
import type { HomeBudgetSummary } from "./types";

export function useHomeBudgetSummary(familyId: string): HomeBudgetSummary | undefined {
  return useStoreQuery(
    `home-budget:${familyId}`,
    (store) => getHomeBudgetSummary(store, familyId),
    ["budget_categories", "budget_lines", "budget_line_cycles"]
  );
}

export function useCategoryOptions(familyId: string): Array<{ id: string; name: string }> | undefined {
  return useStoreQuery(`budget-categories:${familyId}`, (store) => getCategoryOptions(store, familyId), ["budget_categories"]);
}

export function useHomeCategories(familyId: string): HomeCategory[] | undefined {
  return useStoreQuery(`home-categories:${familyId}`, (store) => getHomeCategories(store, familyId), ["budget_categories"]);
}
