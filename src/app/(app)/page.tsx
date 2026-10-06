"use client";

import { useAppData } from "@/shared/session/AppDataContext";
import { paletteSoftColor } from "@/shared/design-tokens/palettes";
import { isModuleActive } from "@/domains/family/settings";
import { useHomeBudgetSummary } from "@/domains/budget/hooks";
import { useUnreadCount } from "@/domains/notifications/hooks";
import { TasksBlock } from "@/domains/tasks/components/TasksBlock";
import { BudgetCard } from "@/domains/budget/components/BudgetCard";
import { ChildHome } from "@/domains/motivation/components/ChildHome";
import { ProgressCard } from "@/domains/motivation/components/ProgressCard";
import { CompactTopBar } from "@/shared/ui/CompactTopBar";
import { SecureDocumentsCard } from "@/shared/ui/SecureDocumentsCard";
import { QuickAccessRow } from "@/shared/ui/QuickAccessRow";

export default function HomePage() {
  const { member, family } = useAppData();
  const budgetSummary = useHomeBudgetSummary(family.id);
  const unreadCount = useUnreadCount(member.id);

  // Un enfant accompagné n'a pas d'écran d'accueil : il arrive sur sa page unique.
  if (member.role === "enfant" && member.accessStatus === "managed") return <ChildHome />;

  return (
    <div>
      <CompactTopBar label={family.name} memberName={member.name} signatureColor={paletteSoftColor(member.signatureColor)} unreadCount={unreadCount} />

      {member.role === "enfant" && <ProgressCard childId={member.id} />}

      <TasksBlock familyId={family.id} memberId={member.id} />

      {/* Le budget n'existe que dans l'espace parent : l'enfant ne voit jamais l'argent. */}
      {member.role === "parent" && family.settings.budgetEnabled && budgetSummary && (
        <BudgetCard
          summary={budgetSummary}
          currency={family.currency}
          defaultAmountsHidden={family.securityLevel === "accueil_protege"}
        />
      )}

      {isModuleActive(family.settings, "documents") && <SecureDocumentsCard />}

      <QuickAccessRow />
    </div>
  );
}
