"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFamilyState } from "@/domains/family/hooks";
import { getThemeVars } from "@/shared/design-tokens/theme";
import { AppShell } from "@/shared/ui/AppShell";
import { OnboardingWizard } from "./OnboardingWizard";

// N'affiche l'onboarding que si aucune famille n'existe au chargement ; sinon
// retour à l'accueil. Une fois le parcours lancé, le wizard reste affiché même
// si la famille apparaît en cours d'écriture : c'est lui qui redirige à la fin.
export function OnboardingGate() {
  const router = useRouter();
  const state = useFamilyState();
  const [hadFamilyAtLoad, setHadFamilyAtLoad] = useState<boolean | null>(null);

  if (state !== undefined && hadFamilyAtLoad === null) {
    setHadFamilyAtLoad(state !== null);
  }

  useEffect(() => {
    if (hadFamilyAtLoad === true) router.replace("/");
  }, [hadFamilyAtLoad, router]);

  if (hadFamilyAtLoad !== false) return null;

  const themeVars = getThemeVars({ paletteKey: "sauge", isChildSpace: false, isDark: false });
  return (
    <AppShell themeVars={themeVars}>
      <OnboardingWizard />
    </AppShell>
  );
}
