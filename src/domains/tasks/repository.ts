import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore } from "@/shared/data/types";
import { toDateString } from "@/shared/lib/date";
import type { HomeTask } from "./types";

// Le seul endroit autorisé à lire/écrire `tasks`, toujours via le DataStore.

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type MemberRow = Database["public"]["Tables"]["family_members"]["Row"];

const HOME_TASK_LIMIT = 10;

export async function getHomeTasks(store: DataStore, familyId: string): Promise<HomeTask[]> {
  const today = toDateString(new Date());
  const [tasks, members] = await Promise.all([
    store.list<TaskRow>("tasks", { family_id: familyId }),
    store.list<MemberRow>("family_members", { family_id: familyId }),
  ]);
  const memberById = new Map(members.map((member) => [member.id, member]));

  return tasks
    .filter((task) => task.due_date !== null && task.due_date <= today)
    .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
    .slice(0, HOME_TASK_LIMIT)
    .map((task) => {
      const subject = task.subject_id ? memberById.get(task.subject_id) : undefined;
      return {
        id: task.id,
        title: task.title,
        dueDate: task.due_date,
        completedAt: task.completed_at,
        subject: subject ? { id: subject.id, name: subject.name, signatureColor: subject.signature_color } : null,
      };
    });
}

export async function setTaskCompletion(store: DataStore, taskId: string, completed: boolean): Promise<void> {
  await store.update<TaskRow>("tasks", taskId, { completed_at: completed ? new Date().toISOString() : null });
}
