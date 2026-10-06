"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { subscribeMemberSelection } from "@/shared/session/session";
import { loadFamilyState } from "./repository";
import type { FamilyState } from "./types";

// `undefined` = chargement en cours ; `null` = aucune famille (→ onboarding).
export function useFamilyState(): FamilyState | null | undefined {
  return useStoreQuery<FamilyState | null>(
    "family-state",
    loadFamilyState,
    ["families", "family_members"],
    subscribeMemberSelection
  );
}
