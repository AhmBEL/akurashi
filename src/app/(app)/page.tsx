"use client";

import { useAppData } from "@/shared/session/AppDataContext";
import { paletteSoftColor } from "@/shared/design-tokens/palettes";
import { useHomeBudgetSummary } from "@/domains/budget/hooks";
import { TasksBlock } from "@/domains/tasks/components/TasksBlock";
import { BudgetCard } from "@/domains/budget/components/BudgetCard";
import { CompactTopBar } from "@/shared/ui/CompactTopBar";
import { SecureDocumentsCard } from "@/shared/ui/SecureDocumentsCard";
import { QuickAccessRow } from "@/shared/ui/QuickAccessRow";

export default function HomePage() {
  const { member, family } = useAppData();
  const budgetSummary = useHomeBudgetSummary(family.id);

  return (
    <div>
      <CompactTopBar label={family.name} memberName={member.name} signatureColor={paletteSoftColor(member.signatureColor)} />

      <TasksBlock familyId={family.id} />

      {budgetSummary && (
        <BudgetCard
          summary={budgetSummary}
          currency={family.currency}
          defaultAmountsHidden={family.securityLevel === "accueil_protege"}
        />
      )}

      <SecureDocumentsCard />

      <QuickAccessRow />
    </div>
  );
}
