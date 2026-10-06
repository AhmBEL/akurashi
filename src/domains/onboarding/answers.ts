import { DEFAULT_PALETTE, isPaletteKey, type PaletteKey } from "@/shared/design-tokens/palettes";
import { toMinorUnits } from "@/shared/lib/money";
import {
  DEFAULT_CURRENCY,
  DEFAULT_FAMILY_NAME,
  DEFAULT_PARENT_NAME,
  DEFAULT_SECURITY_LEVEL,
} from "@/domains/family/defaults";
import {
  DEFAULT_FAMILY_SETTINGS,
  MODULES,
  type FamilySettings,
  type ModuleKey,
  type OtherParentMode,
} from "@/domains/family/settings";
import type { Family } from "@/domains/family/types";
import { DEFAULT_VISUAL_THEME, suggestRewardType } from "@/domains/child/defaults";
import {
  NO_REWARD,
  VISUAL_THEMES,
  type CompensationType,
  type RewardConfig,
  type RewardType,
  type VisualTheme,
} from "@/domains/child/types";
import { DEFAULT_TASK_CATEGORIES } from "@/domains/tasks/defaults";

// Réponses brutes de l'onboarding : tout est optionnel, car toute question
// est sautable (brief §4). `normalizeOnboarding` applique les valeurs par défaut.

export interface ChildDraft {
  name?: string;
  age?: number | null;
  autonomous?: boolean;
  rdvPrive?: boolean;
  reward?: boolean;
  compensation?: Exclude<CompensationType, "financiere_indexee">;
  rewardType?: Exclude<RewardType, "aucun">;
  theme?: VisualTheme;
}

export interface FixedChargeDraft {
  name: string;
  amount?: number | null; // unités entières de la devise (pas de centimes à saisir)
}

export interface OnboardingDraft {
  familyName?: string;
  parentName?: string;
  parentColor?: string;
  currency?: string;
  otherParent?: OtherParentMode;
  children?: ChildDraft[];
  budgetEnabled?: boolean;
  budgetResetDay?: number;
  fixedCharges?: FixedChargeDraft[];
  coursesTarget?: number | null;
  loisirsTarget?: number | null;
  modules?: Partial<Record<ModuleKey, boolean>>;
  taskCategories?: string[];
  securityLevel?: Family["securityLevel"];
  recomposedFamily?: boolean;
}

export interface NormalizedChild {
  name: string;
  age: number | null;
  accessStatus: "managed" | "invited_pending";
  rdvPriveAutorise: boolean;
  reward: RewardConfig;
}

export interface OnboardingAnswers {
  familyName: string;
  parentName: string;
  parentColor: PaletteKey;
  currency: string;
  securityLevel: Family["securityLevel"];
  settings: FamilySettings;
  children: NormalizedChild[];
  fixedCharges: Array<{ name: string; amountMinorUnits: number | null }>;
  coursesTargetMinorUnits: number | null;
  loisirsTargetMinorUnits: number | null;
  taskCategoryNames: string[];
}

const trimmedOr = (value: string | undefined, fallback: string) => value?.trim() || fallback;
const positiveMinorUnits = (amount: number | null | undefined) =>
  amount && amount > 0 ? toMinorUnits(amount) : null;

function normalizeChild(draft: ChildDraft, index: number): NormalizedChild {
  const age = typeof draft.age === "number" && draft.age >= 0 ? Math.round(draft.age) : null;
  const autonomous = draft.autonomous === true;

  let reward: RewardConfig = NO_REWARD;
  if (draft.reward === true) {
    const type = draft.rewardType ?? suggestRewardType(age);
    reward = {
      type,
      compensationType: draft.compensation ?? "aucune",
      visualTheme: type === "badge" ? (draft.theme && VISUAL_THEMES.includes(draft.theme) ? draft.theme : DEFAULT_VISUAL_THEME) : null,
    };
  }

  return {
    name: trimmedOr(draft.name, `Enfant ${index + 1}`),
    age,
    accessStatus: autonomous ? "invited_pending" : "managed",
    rdvPriveAutorise: autonomous && draft.rdvPrive === true,
    reward,
  };
}

export function normalizeOnboarding(draft: OnboardingDraft): OnboardingAnswers {
  const budgetEnabled = draft.budgetEnabled ?? DEFAULT_FAMILY_SETTINGS.budgetEnabled;
  const modules = Object.fromEntries(
    MODULES.map((module) => [module, draft.modules?.[module] ?? DEFAULT_FAMILY_SETTINGS.modules[module]])
  ) as Record<ModuleKey, boolean>;
  const validCategories = new Set(DEFAULT_TASK_CATEGORIES.map((category) => category.name));

  return {
    familyName: trimmedOr(draft.familyName, DEFAULT_FAMILY_NAME),
    parentName: trimmedOr(draft.parentName, DEFAULT_PARENT_NAME),
    parentColor: draft.parentColor && isPaletteKey(draft.parentColor) ? draft.parentColor : DEFAULT_PALETTE,
    currency: draft.currency || DEFAULT_CURRENCY,
    securityLevel: draft.securityLevel ?? DEFAULT_SECURITY_LEVEL,
    settings: {
      otherParent: draft.otherParent ?? DEFAULT_FAMILY_SETTINGS.otherParent,
      inviteCode: null,
      budgetEnabled,
      budgetResetDay: Math.min(28, Math.max(1, Math.round(draft.budgetResetDay ?? DEFAULT_FAMILY_SETTINGS.budgetResetDay))),
      modules,
      recomposedFamily: draft.recomposedFamily ?? DEFAULT_FAMILY_SETTINGS.recomposedFamily,
    },
    children: (draft.children ?? []).map(normalizeChild),
    fixedCharges: budgetEnabled
      ? (draft.fixedCharges ?? [])
          .filter((charge) => charge.name.trim())
          .map((charge) => ({ name: charge.name.trim(), amountMinorUnits: positiveMinorUnits(charge.amount) }))
      : [],
    coursesTargetMinorUnits: budgetEnabled ? positiveMinorUnits(draft.coursesTarget) : null,
    loisirsTargetMinorUnits: budgetEnabled ? positiveMinorUnits(draft.loisirsTarget) : null,
    taskCategoryNames: draft.taskCategories
      ? draft.taskCategories.filter((name) => validCategories.has(name))
      : DEFAULT_TASK_CATEGORIES.map((category) => category.name),
  };
}
