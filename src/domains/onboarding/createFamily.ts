import type { DataStore } from "@/shared/data/types";
import { computeAgeFromBirthDate } from "@/shared/lib/date";
import { createFamily, createFamilyMember } from "@/domains/family/repository";
import { seedDefaultCategories } from "@/domains/budget/repository";
import { createFamilyFormSchema } from "./validation";
import type { CreateFamilyOnboardingInput } from "./types";

// Orchestre la création de la famille à partir des réponses de l'onboarding.
// `parentAccountId` : compte Supabase du parent en version finale, null en démo.
export async function createFamilyFromOnboarding(
  store: DataStore,
  input: CreateFamilyOnboardingInput,
  parentAccountId: string | null,
  currency: string
): Promise<{ error: string | null }> {
  const parsed = createFamilyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const { parentName, parentBirthDate, paletteKey, painPoints, children } = parsed.data;

  try {
    const family = await createFamily(store, { name: `Famille de ${parentName}`, currency, painPoints });

    await createFamilyMember(store, {
      familyId: family.id,
      name: parentName,
      role: "parent",
      age: computeAgeFromBirthDate(parentBirthDate),
      signatureColor: paletteKey,
      accessStatus: null,
      linkedAccountId: parentAccountId,
    });

    for (const child of children) {
      await createFamilyMember(store, {
        familyId: family.id,
        name: child.name,
        role: "enfant",
        age: computeAgeFromBirthDate(child.birthDate),
        signatureColor: paletteKey,
        accessStatus: "managed",
        linkedAccountId: null,
      });
    }

    await seedDefaultCategories(store, family.id);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Impossible de créer la famille." };
  }
}
