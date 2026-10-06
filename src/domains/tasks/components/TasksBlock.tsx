"use client";

import Link from "next/link";
import { getStore } from "@/shared/data/getStore";
import { toDateString } from "@/shared/lib/date";
import { useTasksOfMember } from "../hooks";
import { toggleTaskCompletion } from "@/domains/motivation/repository";
import { isDueToday } from "../services/taskRules";
import type { TaskView } from "../types";
import { TaskRow } from "./TaskRow";
import styles from "./TasksBlock.module.css";

const HOME_LIMIT = 8;

interface TasksBlockProps {
  familyId: string;
  memberId: string;
}

// « Mes tâches du jour » : à faire aujourd'hui ou en retard, plus celles
// cochées aujourd'hui (elles restent barrées jusqu'à demain).
export function TasksBlock({ familyId, memberId }: TasksBlockProps) {
  const tasks = useTasksOfMember(familyId, memberId, memberId);
  const today = new Date();
  const todayKey = toDateString(today);

  const visible = (tasks ?? [])
    .filter((task) => isDueToday(task, today))
    .filter((task) => !task.done || (task.completedAt !== null && toDateString(new Date(task.completedAt)) === todayKey))
    .slice(0, HOME_LIMIT);

  const toggle = (task: TaskView) => {
    void toggleTaskCompletion(getStore(), {
      familyId,
      taskId: task.id,
      subjectId: memberId,
      actorId: memberId,
      completed: !task.done,
    });
  };

  return (
    <div>
      <div className={styles.title}>Mes tâches</div>
      {visible.length === 0 ? (
        <div className={styles.empty}>Rien à faire aujourd&rsquo;hui.</div>
      ) : (
        <div className={styles.list}>
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggle} />
          ))}
        </div>
      )}
      <Link href="/taches" className={styles.more}>
        Voir toutes les tâches
      </Link>
    </div>
  );
}
