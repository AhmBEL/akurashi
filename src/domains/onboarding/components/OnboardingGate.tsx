"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFamilyState } from "@/domains/family/hooks";
import { getThemeVars } from "@/shared/design-tokens/theme";
import { AppShell } from "@/shared/ui/AppShell";
import { OnboardingWizard } from "./OnboardingWizard";

// N'affiche l'onboarding que s'il n'y a pas encore de famille ; sinon retour à l'accueil.
export function OnboardingGate() {
  const router = useRouter();
  const state = useFamilyState();

  useEffect(() => {
    if (state) router.replace("/");
  }, [state, router]);

  if (state !== null) return null;

  const themeVars = getThemeVars({ paletteKey: "sauge", isChildSpace: false, isDark: false });
  return (
    <AppShell themeVars={themeVars}>
      <OnboardingWizard />
    </AppShell>
  );
}
