import { z } from "zod";

// Réglages de la famille issus de l'onboarding (brief §4) et modifiables
// ensuite dans Réglages. Stockés dans `families.settings` ; chaque champ a
// une valeur par défaut : une question sautée applique ce défaut.

export const MODULES = ["sujets", "courses", "documents", "contacts", "agenda"] as const;
export type ModuleKey = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  sujets: "Sujets",
  courses: "Listes de courses",
  documents: "Documents",
  contacts: "Contacts",
  agenda: "Agenda",
};

export const OTHER_PARENT_MODES = ["none", "later", "invite_now"] as const;
export type OtherParentMode = (typeof OTHER_PARENT_MODES)[number];

const modulesSchema = z.object({
  sujets: z.boolean().default(true),
  courses: z.boolean().default(true),
  documents: z.boolean().default(true),
  contacts: z.boolean().default(true),
  agenda: z.boolean().default(true),
});

export const familySettingsSchema = z.object({
  otherParent: z.enum(OTHER_PARENT_MODES).default("later"),
  inviteCode: z.string().nullable().default(null),
  budgetEnabled: z.boolean().default(true),
  budgetResetDay: z.number().int().min(1).max(28).default(1),
  modules: modulesSchema.prefault({}),
  recomposedFamily: z.boolean().default(false),
});

export type FamilySettings = z.infer<typeof familySettingsSchema>;

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = familySettingsSchema.parse({});

export function parseFamilySettings(raw: unknown): FamilySettings {
  const result = familySettingsSchema.safeParse(raw ?? {});
  return result.success ? result.data : DEFAULT_FAMILY_SETTINGS;
}

export const isModuleActive = (settings: FamilySettings, module: ModuleKey): boolean => settings.modules[module];

// « Un autre parent ? non » masque messagerie parent-parent et assignation entre parents.
export const hasOtherParent = (settings: FamilySettings): boolean => settings.otherParent !== "none";
