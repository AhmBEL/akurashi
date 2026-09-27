"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { createFamily, createFamilyMember } from "@/domains/family/repository";
import { computeAgeFromBirthDate } from "@/shared/lib/date";
import { createFamilyFormSchema } from "./validation";
import type { CreateFamilyOnboardingInput } from "./types";

export async function createFamilyAction(
  input: CreateFamilyOnboardingInput
): Promise<{ error: string | null }> {
  const parsed = createFamilyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { error: "Session expirée, reconnecte-toi." };
  }

  const { parentName, parentBirthDate, paletteKey, painPoints, children } = parsed.data;

  const family = await createFamily(supabase, {
    name: `Famille de ${parentName}`,
    painPoints,
  });
  if (family.error || !family.id) {
    return { error: family.error ?? "Impossible de créer la famille." };
  }

  const parent = await createFamilyMember(supabase, {
    familyId: family.id,
    name: parentName,
    role: "parent",
    age: computeAgeFromBirthDate(parentBirthDate),
    signatureColor: paletteKey,
    linkedAccountId: auth.user.id,
  });
  if (parent.error) {
    return { error: parent.error };
  }

  for (const child of children) {
    const result = await createFamilyMember(supabase, {
      familyId: family.id,
      name: child.name,
      role: "enfant",
      age: computeAgeFromBirthDate(child.birthDate),
      signatureColor: paletteKey,
      accessStatus: "managed",
    });
    if (result.error) {
      return { error: result.error };
    }
  }

  redirect("/");
}
