"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getTaskCategories, getTasksOfMember } from "./repository";
import type { TaskView } from "./types";

const TASK_TABLES = ["tasks", "task_participants", "task_categories_link", "task_categories", "family_members"];

export function useTasksOfMember(familyId: string, memberId: string, viewerId: string): TaskView[] | undefined {
  return useStoreQuery(
    `tasks:${familyId}:${memberId}:${viewerId}`,
    (store) => getTasksOfMember(store, familyId, memberId, viewerId),
    TASK_TABLES
  );
}

export function useTaskCategories(familyId: string): Array<{ id: string; name: string }> | undefined {
  return useStoreQuery(`task-categories:${familyId}`, (store) => getTaskCategories(store, familyId), ["task_categories"]);
}
