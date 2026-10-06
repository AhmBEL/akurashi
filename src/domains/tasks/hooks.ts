"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getHomeTasks } from "./repository";
import type { HomeTask } from "./types";

export function useHomeTasks(familyId: string): HomeTask[] | undefined {
  return useStoreQuery(`home-tasks:${familyId}`, (store) => getHomeTasks(store, familyId), ["tasks", "family_members"]);
}
