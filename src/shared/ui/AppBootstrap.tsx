"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFamilyState } from "@/domains/family/hooks";
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
