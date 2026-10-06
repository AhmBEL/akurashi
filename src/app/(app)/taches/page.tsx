"use client";

import { useState } from "react";
import { getStore } from "@/shared/data/getStore";
import { useAppData } from "@/shared/session/AppDataContext";
import { PillButton } from "@/shared/ui/PillButton";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { TaskRow } from "@/domains/tasks/components/TaskRow";
import { TaskSheet } from "@/domains/tasks/components/TaskSheet";
import { useTasksOfMember } from "@/domains/tasks/hooks";
import { setTaskCompletion } from "@/domains/tasks/repository";
import { bucketOf } from "@/domains/tasks/services/taskRules";
import type { TaskBucket, TaskView } from "@/domains/tasks/types";
import styles from "@/domains/tasks/components/TasksBlock.module.css";

const BUCKETS: Array<{ key: TaskBucket; title: string }> = [
  { key: "perso", title: "Perso — périodiques" },
  { key: "famille", title: "Famille — périodiques" },
  { key: "ponctuelles", title: "Ponctuelles" },
];

// Page dédiée par personne, en trois blocs (brief §4.4).
export default function TachesPage() {
  const { member, family, members } = useAppData();
  const [selectedId, setSelectedId] = useState(member.id);
  const [creating, setCreating] = useState(false);
  const tasks = useTasksOfMember(family.id, selectedId, member.id) ?? [];

  const toggle = (task: TaskView) => {
    void setTaskCompletion(getStore(), task.id, !task.done);
  };

  return (
    <div>
      <div className={styles.title}>Tâches</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 6px" }}>
        {members.map((candidate) => (
          <Chip key={candidate.id} active={candidate.id === selectedId} onClick={() => setSelectedId(candidate.id)}>
            {candidate.name}
          </Chip>
        ))}
      </div>

      {tasks.length === 0 && <div className={styles.empty} style={{ marginTop: 16 }}>Aucune tâche pour l&rsquo;instant.</div>}

      {BUCKETS.map(({ key, title }) => {
        const inBucket = tasks.filter(
          (task) => bucketOf({ recurrenceDays: task.recurrenceDays, participantCount: task.participants.length }) === key
        );
        if (inBucket.length === 0) return null;
        return (
          <div key={key}>
            <div className={styles.blockTitle}>{title}</div>
            <div className={styles.list}>
              {inBucket.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggle} />
              ))}
            </div>
          </div>
        );
      })}

      <PillButton variant="primary" block onClick={() => setCreating(true)} style={{ marginTop: 8 }}>
        + Nouvelle tâche
      </PillButton>
      <TaskSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
