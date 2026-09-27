"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { addExpense, type AddExpenseInput } from "./repository";

export async function addExpenseAction(input: AddExpenseInput) {
  const supabase = await createClient();
  const result = await addExpense(supabase, input);
  if (!result.error) {
    revalidatePath("/");
  }
  return result;
}
