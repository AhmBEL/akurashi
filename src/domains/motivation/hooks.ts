"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getChildProgress, type ChildProgress } from "./repository";

export function useChildProgress(childId: string): ChildProgress | undefined {
  return useStoreQuery(`child-progress:${childId}`, (store) => getChildProgress(store, childId), [
    "task_completions",
    "reward_systems",
    "reward_thresholds",
    "tasks",
  ]);
}
