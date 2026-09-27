"use client";

import { useOptimistic, useTransition } from "react";
import { Avatar } from "@/shared/ui/Avatar";
import type { HomeTask } from "../types";
import { toggleTaskCompletionAction } from "../actions";
import styles from "./TasksBlock.module.css";

interface TasksBlockProps {
  tasks: HomeTask[];
}

export function TasksBlock({ tasks }: TasksBlockProps) {
  const [, startTransition] = useTransition();
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (state, taskId: string) =>
      state.map((t) => (t.id === taskId ? { ...t, completedAt: t.completedAt ? null : new Date().toISOString() } : t))
  );

  const toggle = (task: HomeTask) => {
    startTransition(() => {
      setOptimisticTasks(task.id);
      void toggleTaskCompletionAction(task.id, !task.completedAt);
    });
  };

  return (
    <div>
      <div className={styles.title}>Tâches</div>
      {optimisticTasks.length === 0 ? (
        <div className={styles.empty}>Rien à faire aujourd&rsquo;hui.</div>
      ) : (
        <div className={styles.list}>
          {optimisticTasks.map((task) => {
            const done = Boolean(task.completedAt);
            return (
              <button key={task.id} className={styles.row} onClick={() => toggle(task)}>
                <span className={[styles.check, done ? styles.checked : ""].filter(Boolean).join(" ")} />
                <span className={[styles.label, done ? styles.done : ""].filter(Boolean).join(" ")}>
                  {task.title}
                </span>
                {task.subject ? <Avatar name={task.subject.name} color={task.subject.signatureColor} size={28} /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
