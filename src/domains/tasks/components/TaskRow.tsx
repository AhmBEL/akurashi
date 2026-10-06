"use client";

import { Avatar } from "@/shared/ui/Avatar";
import { paletteSoftColor } from "@/shared/design-tokens/palettes";
import { describeRecurrence } from "../services/taskRules";
import type { TaskView } from "../types";
import styles from "./TasksBlock.module.css";

interface TaskRowProps {
  task: TaskView;
  onToggle: (task: TaskView) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function formatWhen(task: TaskView): string | null {
  if (task.recurrenceDays.length > 0) return describeRecurrence(task.recurrenceDays);
  if (!task.dueDate) return null;
  const date = DATE_FORMAT.format(new Date(`${task.dueDate}T00:00:00`));
  return task.dueTime ? `${date} · ${task.dueTime.slice(0, 5)}` : date;
}

export function TaskRow({ task, onToggle }: TaskRowProps) {
  const when = formatWhen(task);

  return (
    <button className={styles.row} onClick={() => onToggle(task)}>
      <span className={[styles.check, task.done ? styles.checked : ""].filter(Boolean).join(" ")} />
      <span className={styles.main}>
        <span className={[styles.label, task.done ? styles.done : ""].filter(Boolean).join(" ")}>{task.title}</span>
        <span className={styles.meta}>
          {task.isUrgent && <span className={[styles.badge, styles.badgeUrgent].join(" ")}>Urgent</span>}
          {task.assignmentStatus === "a_discuter" && <span className={styles.badge}>à discuter</span>}
          {task.isPrivate && <span className={styles.badge}>privé</span>}
          {when && <span>{when}</span>}
          {task.locationText && <span>· {task.locationText}</span>}
          {task.categoryNames.map((name) => (
            <span key={name}>· {name}</span>
          ))}
        </span>
      </span>
      <span className={styles.avatars}>
        {task.participants.map((participant) => (
          <Avatar key={participant.id} name={participant.name} color={paletteSoftColor(participant.signatureColor)} size={26} />
        ))}
      </span>
    </button>
  );
}
