import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentMember } from "@/domains/family/repository";
import { getThemeVars } from "@/shared/design-tokens/theme";
import { AppShell } from "@/shared/ui/AppShell";
import { OnboardingWizard } from "@/domains/onboarding/components/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (member) {
    redirect("/");
  }

  const themeVars = getThemeVars({ paletteKey: "sauge", isChildSpace: false, isDark: false });

  return (
    <AppShell themeVars={themeVars}>
      <OnboardingWizard />
    </AppShell>
  );
}
