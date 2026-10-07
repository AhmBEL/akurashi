"use client";

import { now } from "@/shared/lib/clock";
import { useState } from "react";
import Link from "next/link";
import { Hand } from "lucide-react";
import { isDemoMode } from "@/shared/config";
import { getStore } from "@/shared/data/getStore";
import { toDateString } from "@/shared/lib/date";
import { useAppData } from "@/shared/session/AppDataContext";
import { TaskRow } from "@/domains/tasks/components/TaskRow";
import { useTasksOfMember } from "@/domains/tasks/hooks";
import { isDueToday } from "@/domains/tasks/services/taskRules";
import type { TaskView } from "@/domains/tasks/types";
import taskStyles from "@/domains/tasks/components/TasksBlock.module.css";
import { requestHelp, toggleTaskCompletion } from "../repository";
import { ProgressCard } from "./ProgressCard";

// Page unique de l'enfant accompagné (brief §4.8) : tâches du jour, progression,
// phrase de motivation, bouton d'aide. Rien d'autre, et aucun montant.
export function ChildHome() {
  const { member, family } = useAppData();
  const tasks = useTasksOfMember(family.id, member.id, member.id) ?? [];
  const [helpSent, setHelpSent] = useState(false);

  const today = now();
  const todayKey = toDateString(today);
  const todays = tasks.filter(
    (task) => isDueToday(task, today) && (!task.done || (task.completedAt !== null && toDateString(new Date(task.completedAt)) === todayKey))
  );
  const todo = todays.filter((task) => !task.done);
  const done = todays.filter((task) => task.done);

  const complete = (task: TaskView) => {
    // Une tâche cochée ne se décoche pas ici : l'annulation passe par un parent.
    if (task.done) return;
    void toggleTaskCompletion(getStore(), {
      familyId: family.id,
      taskId: task.id,
      subjectId: member.id,
      actorId: member.id,
      completed: true,
    });
  };

  const askForHelp = async () => {
    await requestHelp(getStore(), family.id, member.id);
    setHelpSent(true);
  };

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 30, lineHeight: 1.1, marginBottom: 18 }}>
        Salut {member.name}&nbsp;!
      </div>

      <ProgressCard childId={member.id} />

      <div className={taskStyles.title}>À faire aujourd&rsquo;hui</div>
      {todo.length === 0 ? (
        <div className={taskStyles.empty}>{done.length > 0 ? "Tout est fait, bravo !" : "Rien à faire aujourd'hui."}</div>
      ) : (
        <div className={taskStyles.list}>
          {todo.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={complete} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <div className={taskStyles.blockTitle}>Faites</div>
          <div className={taskStyles.list}>
            {done.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={complete} />
            ))}
          </div>
        </>
      )}

      <p style={{ fontSize: 12, color: "var(--fa-muted)", margin: "6px 0 18px" }}>Un parent valide les tâches que tu coches.</p>

      <button
        onClick={askForHelp}
        disabled={helpSent}
        style={{
          width: "100%",
          border: "2px solid var(--fa-accent)",
          background: "transparent",
          color: "var(--fa-accent)",
          borderRadius: "26px 12px 26px 12px",
          padding: 17,
          font: "inherit",
          fontSize: 16,
          cursor: helpSent ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <Hand size={20} strokeWidth={2.5} />
        {helpSent ? "C'est envoyé, un parent arrive !" : "J'ai besoin d'aide"}
      </button>

      {isDemoMode() && (
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12 }}>
          <Link href="/reglages">Changer de profil (démo)</Link>
        </p>
      )}
    </div>
  );
}
