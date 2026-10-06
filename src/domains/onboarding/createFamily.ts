import type { DataStore } from "@/shared/data/types";
import { createFamily, createFamilyMember } from "@/domains/family/repository";
import { generateInviteCode } from "@/domains/family/inviteCode";
import { saveRewardSystem } from "@/domains/child/repository";
import { createBudgetCategory, createFixedCharge } from "@/domains/budget/repository";
import { DEFAULT_BUDGET_CATEGORIES } from "@/domains/budget/defaults";
import { createTaskCategory } from "@/domains/tasks/repository";
import { DEFAULT_TASK_CATEGORIES } from "@/domains/tasks/defaults";
import { normalizeOnboarding, type OnboardingDraft } from "./answers";

// Écrit chaque réponse dans les données de la famille ; les modules lisent
// ensuite ces données pour s'adapter (brief §4).
// `parentAccountId` : compte Supabase du parent en version finale, null en démo.
export async function createFamilyFromOnboarding(
  store: DataStore,
  draft: OnboardingDraft,
  parentAccountId: string | null
): Promise<{ error: string | null }> {
  const answers = normalizeOnboarding(draft);

  try {
    const family = await createFamily(store, {
      name: answers.familyName,
      currency: answers.currency,
      securityLevel: answers.securityLevel,
      settings: {
        ...answers.settings,
        inviteCode: answers.settings.otherParent === "invite_now" ? generateInviteCode() : null,
      },
    });

    const parent = await createFamilyMember(store, {
      familyId: family.id,
      name: answers.parentName,
      role: "parent",
      age: null,
      signatureColor: answers.parentColor,
      accessStatus: null,
      linkedAccountId: parentAccountId,
    });

    for (const child of answers.children) {
      const member = await createFamilyMember(store, {
        familyId: family.id,
        name: child.name,
        role: "enfant",
        age: child.age,
        signatureColor: answers.parentColor,
        accessStatus: child.accessStatus,
        rdvPriveAutorise: child.rdvPriveAutorise,
        linkedAccountId: null,
      });
      await saveRewardSystem(store, member.id, child.reward);
    }

    for (const name of answers.taskCategoryNames) {
      const category = DEFAULT_TASK_CATEGORIES.find((candidate) => candidate.name === name);
      await createTaskCategory(store, family.id, name, category?.needsContactPlace ?? false);
    }

    if (answers.settings.budgetEnabled) {
      const targets = { courses: answers.coursesTargetMinorUnits, loisirs: answers.loisirsTargetMinorUnits };
      for (const category of DEFAULT_BUDGET_CATEGORIES) {
        await createBudgetCategory(store, {
          familyId: family.id,
          name: category.name,
          showOnHome: true,
          targetAmount: targets[category.key],
          targetPeriod: category.targetPeriod,
        });
      }
      for (const charge of answers.fixedCharges) {
        await createFixedCharge(store, {
          familyId: family.id,
          name: charge.name,
          amountMinorUnits: charge.amountMinorUnits,
          responsibleId: parent.id,
        });
      }
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Impossible de créer la famille." };
  }
}
