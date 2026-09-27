"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { setTaskCompletion } from "./repository";

export async function toggleTaskCompletionAction(taskId: string, completed: boolean) {
  const supabase = await createClient();
  await setTaskCompletion(supabase, taskId, completed);
  revalidatePath("/");
}
