import type { PaletteKey } from "@/shared/design-tokens/palettes";

export interface OnboardingChildInput {
  name: string;
  birthDate: string;
}

export interface CreateFamilyOnboardingInput {
  parentName: string;
  parentBirthDate: string;
  paletteKey: PaletteKey;
  painPoints: string[];
  children: OnboardingChildInput[];
}

export const PAIN_POINT_OPTIONS = [
  "Charge mentale",
  "Budget",
  "Organisation du planning",
  "Devoirs / école",
  "Rendez-vous médicaux",
] as const;
