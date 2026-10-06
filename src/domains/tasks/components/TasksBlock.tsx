"use client";

import { Avatar } from "@/shared/ui/Avatar";
import { getStore } from "@/shared/data/getStore";
import { paletteSoftColor } from "@/shared/design-tokens/palettes";
import { useHomeTasks } from "../hooks";
import { setTaskCompletion } from "../repository";
import type { HomeTask } from "../types";
import styles from "./TasksBlock.module.css";

interface TasksBlockProps {
  familyId: string;
}

export function TasksBlock({ familyId }: TasksBlockProps) {
  const tasks = useHomeTasks(familyId);

  const toggle = (task: HomeTask) => {
    void setTaskCompletion(getStore(), task.id, !task.completedAt);
  };

  return (
    <div>
      <div className={styles.title}>Tâches</div>
      {!tasks || tasks.length === 0 ? (
        <div className={styles.empty}>Rien à faire aujourd&rsquo;hui.</div>
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => {
            const done = Boolean(task.completedAt);
            return (
              <button key={task.id} className={styles.row} onClick={() => toggle(task)}>
                <span className={[styles.check, done ? styles.checked : ""].filter(Boolean).join(" ")} />
                <span className={[styles.label, done ? styles.done : ""].filter(Boolean).join(" ")}>{task.title}</span>
                {task.subject ? (
                  <Avatar name={task.subject.name} color={paletteSoftColor(task.subject.signatureColor)} size={28} />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
