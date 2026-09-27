import type { ReactNode } from "react";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentMember, getFamilyMembers } from "@/domains/family/repository";
import { getHomeCategoryOptions } from "@/domains/budget/repository";
import { getThemeVars } from "@/shared/design-tokens/theme";
import { AppShell } from "@/shared/ui/AppShell";
import { AppChrome } from "@/shared/ui/AppChrome";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (!member) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <p>
          Ton compte n&rsquo;est relié à aucun profil familial pour l&rsquo;instant. L&rsquo;onboarding
          n&rsquo;est pas encore construit dans cette itération — demande à un administrateur de créer ton
          profil dans la base.
        </p>
      </div>
    );
  }

  const themeVars = getThemeVars({
    paletteKey: member.signatureColor,
    isChildSpace: member.role === "enfant",
    isDark: member.darkModeEnabled,
  });

  const [members, budgetCategories] = await Promise.all([
    getFamilyMembers(supabase, member.familyId),
    getHomeCategoryOptions(supabase, member.familyId),
  ]);

  return (
    <AppShell themeVars={themeVars}>
      <AppChrome
        familyId={member.familyId}
        budgetCategories={budgetCategories}
        members={members.map((m) => ({ id: m.id, name: m.name }))}
      >
        {children}
      </AppChrome>
    </AppShell>
  );
}
