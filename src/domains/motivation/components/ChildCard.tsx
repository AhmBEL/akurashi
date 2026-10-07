"use client";

import { now } from "@/shared/lib/clock";
import { getStore } from "@/shared/data/getStore";
import { Card } from "@/shared/ui/Card";
import { PillButton } from "@/shared/ui/PillButton";
import { useAppData } from "@/shared/session/AppDataContext";
import { useTasksOfMember } from "@/domains/tasks/hooks";
import { isDueToday } from "@/domains/tasks/services/taskRules";
import type { FamilyMember } from "@/domains/family/types";
import { useChildProgress } from "../hooks";
import { undoLastAction } from "../repository";
import { ProgressCard } from "./ProgressCard";

// Vue parent d'un enfant : progression, tâches du jour, montant du palier
// (financier) et annulation de la dernière action (un seul niveau).
export function ChildCard({ child }: { child: FamilyMember }) {
  const { member, family } = useAppData();
  const progress = useChildProgress(child.id);
  const tasks = useTasksOfMember(family.id, child.id, member.id) ?? [];

  const today = now();
  const todays = tasks.filter((task) => isDueToday(task, today));
  const doneCount = todays.filter((task) => task.done).length;
  const lastAction = progress?.lastAction;

  return (
    <div style={{ marginBottom: 22 }}>
      <Card radius="34px 16px 30px 20px" style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>{child.name}</div>
        <div style={{ fontSize: 12.5, color: "var(--fa-muted)", marginTop: 2 }}>
          {child.age !== null ? `${child.age} ans · ` : ""}
          {child.accessStatus === "managed" ? "Accompagné" : "Autonome"}
        </div>
        <div style={{ fontSize: 14, marginTop: 10 }}>
          Aujourd&rsquo;hui : {doneCount} sur {todays.length} tâche{todays.length > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}
        </div>
      </Card>

      <ProgressCard childId={child.id} currencyForAmount={family.currency} />

      {lastAction && (
        <PillButton block onClick={() => void undoLastAction(getStore(), child.id)}>
          ↩ Annuler : « {lastAction.taskTitle} »
        </PillButton>
      )}
    </div>
  );
}
