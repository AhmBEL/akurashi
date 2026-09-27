import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentMember, getFamily } from "@/domains/family/repository";
import { getHomeTasks } from "@/domains/tasks/repository";
import { getHomeBudgetSummary } from "@/domains/budget/repository";
import { TasksBlock } from "@/domains/tasks/components/TasksBlock";
import { BudgetCard } from "@/domains/budget/components/BudgetCard";
import { CompactTopBar } from "@/shared/ui/CompactTopBar";
import { SecureDocumentsCard } from "@/shared/ui/SecureDocumentsCard";
import { QuickAccessRow } from "@/shared/ui/QuickAccessRow";

export default async function HomePage() {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);
  if (!member) return null; // layout already handles the no-member state

  const [family, tasks, budgetSummary] = await Promise.all([
    getFamily(supabase, member.familyId),
    getHomeTasks(supabase, member.familyId),
    getHomeBudgetSummary(supabase, member.familyId),
  ]);

  const currency = family?.currency ?? "EUR";
  const defaultAmountsHidden = family?.securityLevel === "accueil_protege";

  return (
    <div>
      <CompactTopBar label="Akurashi" memberName={member.name} signatureColor={member.signatureColor} />

      <TasksBlock tasks={tasks} />

      <BudgetCard summary={budgetSummary} currency={currency} defaultAmountsHidden={defaultAmountsHidden} />

      <SecureDocumentsCard />

      <QuickAccessRow />
    </div>
  );
}
