import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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
    redirect("/onboarding");
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
