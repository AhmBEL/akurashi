"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getStore } from "@/shared/data/getStore";
import { useFamilyState } from "@/domains/family/hooks";
import { settleDirectDebits } from "@/domains/budget/repository";
import { getThemeVars } from "@/shared/design-tokens/theme";
import { AppDataProvider } from "@/shared/session/AppDataContext";
import { AppShell } from "./AppShell";
import { AppChrome } from "./AppChrome";

// Charge le profil courant et la famille (démo : IndexedDB, finale : Supabase),
// applique le thème du profil, et renvoie vers l'onboarding s'il n'y a pas
// encore de famille.
export function AppBootstrap({ children }: { children: ReactNode }) {
  const router = useRouter();
  const state = useFamilyState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  // Les prélèvements dont le jour est arrivé se valident seuls à l'ouverture de l'app.
  const familyId = state?.family.id;
  const budgetEnabled = state?.family.settings.budgetEnabled;
  useEffect(() => {
    if (familyId && budgetEnabled) void settleDirectDebits(getStore(), familyId);
  }, [familyId, budgetEnabled]);

  if (!state) return null;

  const themeVars = getThemeVars({
    paletteKey: state.member.signatureColor,
    isChildSpace: state.member.role === "enfant",
    isDark: state.member.darkModeEnabled,
  });

  return (
    <AppDataProvider value={state}>
      <AppShell themeVars={themeVars}>
        <AppChrome>{children}</AppChrome>
      </AppShell>
    </AppDataProvider>
  );
}
