"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getAgendaTasks } from "@/domains/tasks/repository";
import type { AgendaTask } from "@/domains/tasks/types";

// L'agenda lit les tâches : il se met à jour dès qu'une tâche, ses participants ou les membres changent.
export function useAgendaTasks(familyId: string, viewerId: string): AgendaTask[] | undefined {
  return useStoreQuery(`agenda:${familyId}:${viewerId}`, (store) => getAgendaTasks(store, familyId, viewerId), [
    "tasks",
    "task_participants",
    "family_members",
  ]);
}
