import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/lib/supabase/database.types";
import type { HomeTask } from "./types";
import { toDateString } from "@/shared/lib/date";

type Client = SupabaseClient<Database>;

// Raw shape of the PostgREST embed below — the hand-written Database type
// (see database.types.ts) doesn't carry relationship metadata, so this join's
// result is asserted rather than inferred until real codegen replaces it.
interface RawTaskWithSubject {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  subject: { id: string; name: string; signature_color: string } | null;
}

// The only place in the app allowed to read/write the `tasks` table directly.

export async function getHomeTasks(supabase: Client, familyId: string): Promise<HomeTask[]> {
  const today = toDateString(new Date());

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, completed_at, subject:subject_id(id, name, signature_color)")
    .eq("family_id", familyId)
    .lte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(10);

  if (error || !data) return [];

  return (data as unknown as RawTaskWithSubject[]).map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.due_date,
    completedAt: t.completed_at,
    subject: t.subject
      ? { id: t.subject.id, name: t.subject.name, signatureColor: t.subject.signature_color }
      : null,
  }));
}

export async function setTaskCompletion(
  supabase: Client,
  taskId: string,
  completed: boolean
): Promise<void> {
  await supabase
    .from("tasks")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", taskId);
}
