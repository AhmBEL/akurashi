"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { getStore } from "@/shared/data/getStore";
import { useAppData } from "@/shared/session/AppDataContext";
import { now } from "@/shared/lib/clock";
import { toDateString } from "@/shared/lib/date";
import { toMinorUnits } from "@/shared/lib/money";
import { hasOtherParent } from "@/domains/family/settings";
import { useCategoryOptions } from "@/domains/budget/hooks";
import { addExpense } from "@/domains/budget/repository";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { TASK_TEMPLATES, WEEKDAY_LABELS } from "../defaults";
import { useTaskCategories } from "../hooks";
import { createTask } from "../repository";
import styles from "./TaskSheet.module.css";

const titleSchema = z.string().trim().min(1, "Donne un titre à la tâche");

interface TaskSheetProps {
  open: boolean;
  onClose: () => void;
}

// Fiche tâche / rendez-vous (écran 04 #4) : un rendez-vous est une tâche avec
// une date et une heure. Les participants déterminent l'assignation.
export function TaskSheet({ open, onClose }: TaskSheetProps) {
  const { member, family, members } = useAppData();
  const categories = useTaskCategories(family.id) ?? [];
  const budgetCategories = useCategoryOptions(family.id) ?? [];

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [chosenParticipants, setChosenParticipants] = useState<string[] | null>(null);
  const [discuss, setDiscuss] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [withBudget, setWithBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  // Sans choix explicite, la tâche est auto-assignée au créateur.
  const participantIds = isPrivate ? [member.id] : discuss ? [] : (chosenParticipants ?? [member.id]);
  // « Pas d'autre parent » (onboarding) : pas d'assignation à l'autre parent.
  const assignable = members.filter((candidate) => candidate.id === member.id || candidate.role === "enfant" || hasOtherParent(family.settings));
  const canDiscuss = hasOtherParent(family.settings) && members.some((candidate) => candidate.role === "parent" && candidate.id !== member.id);
  const canAddBudget = member.role === "parent" && family.settings.budgetEnabled;
  const categoryName = categories.find((category) => category.id === categoryId)?.name;

  const toggleParticipant = (id: string) => {
    setDiscuss(false);
    setChosenParticipants(participantIds.includes(id) ? participantIds.filter((p) => p !== id) : [...participantIds, id]);
  };
  const toggleDay = (day: number) =>
    setRecurrenceDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));

  const reset = () => {
    setTitle("");
    setCategoryId(null);
    setDescription("");
    setLocationText("");
    setDueDate("");
    setDueTime("");
    setChosenParticipants(null);
    setDiscuss(false);
    setRecurrenceDays([]);
    setIsUrgent(false);
    setIsPrivate(false);
    setWithBudget(false);
    setBudgetAmount("");
    setError(null);
  };

  const submit = () => {
    const parsedTitle = titleSchema.safeParse(title);
    if (!parsedTitle.success) {
      setError(parsedTitle.error.issues[0].message);
      return;
    }
    const budget = Number(budgetAmount);
    if (withBudget && !(budget > 0)) {
      setError("Indique le montant du budget de cette tâche");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const taskId = await createTask(getStore(), {
          familyId: family.id,
          creatorId: member.id,
          title: parsedTitle.data,
          description: description.trim() || null,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          locationText: locationText.trim() || null,
          participantIds,
          discuss,
          recurrenceDays,
          isUrgent,
          isPrivate,
          categoryId,
        });
        // Budget de la tâche : une dépense prévue, liée à la tâche, à faire valider par l'autre parent.
        if (withBudget) {
          await addExpense(getStore(), {
            familyId: family.id,
            actorId: member.id,
            categoryId: budgetCategoryId || budgetCategories[0]?.id || null,
            newCategoryName: budgetCategories.length === 0 ? "Autre" : null,
            amountMinorUnits: toMinorUnits(budget),
            financialType: "variable_prevue",
            responsibleId: member.id,
            spentOn: dueDate || toDateString(now()),
            note: parsedTitle.data,
            taskId,
            requestValidation: true,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer la tâche");
        return;
      }
      reset();
      onClose();
    });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.cancel} onClick={onClose}>Annuler</button>
          <div className={styles.headTitle}>Nouvelle tâche</div>
          <span style={{ width: 44 }} />
        </div>

        <div className={styles.field}>
          <label htmlFor="task-title">Titre</label>
          <input
            id="task-title"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Que faut-il faire ?"
          />
        </div>

        {categories.length > 0 && (
          <div className={styles.field}>
            <label>Type</label>
            <div className={styles.chips}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
                >
                  {category.name}
                </Chip>
              ))}
            </div>
            {categoryName && TASK_TEMPLATES[categoryName] && (
              <div className={styles.chips} style={{ marginTop: 8 }}>
                {TASK_TEMPLATES[categoryName].map((template) => (
                  <Chip key={template} active={title === template} onClick={() => setTitle(template)}>
                    {template}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.field}>
          <label>Qui s&rsquo;en occupe ?</label>
          <div className={styles.chips}>
            {assignable.map((candidate) => (
              <Chip
                key={candidate.id}
                active={participantIds.includes(candidate.id)}
                onClick={() => !isPrivate && toggleParticipant(candidate.id)}
              >
                {candidate.id === member.id ? `${candidate.name} (moi)` : candidate.name}
              </Chip>
            ))}
            {canDiscuss && !isPrivate && (
              <Chip active={discuss} onClick={() => setDiscuss(!discuss)}>À discuter</Chip>
            )}
          </div>
          <div className={styles.hint}>
            {isPrivate
              ? "Tâche privée : visible par toi seul."
              : discuss
                ? "Signalée à l'autre parent, sans assignation."
                : participantIds.length === 0
                  ? "Personne pour l'instant (à décider)."
                  : participantIds.length > 1
                    ? "Tâche partagée."
                    : participantIds[0] === member.id
                      ? "Tu te l'assignes."
                      : "Assignée : la personne sera notifiée."}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="task-date">Date</label>
            <input id="task-date" className={styles.input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-time">Heure</label>
            <input id="task-time" className={styles.input} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <label>Répéter chaque semaine</label>
          <div className={styles.chips}>
            {WEEKDAY_LABELS.map((label, day) => (
              <Chip key={label} active={recurrenceDays.includes(day)} onClick={() => toggleDay(day)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="task-location">Où (optionnel)</label>
          <input id="task-location" className={styles.input} value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Lieu, contact…" />
        </div>

        <div className={styles.field}>
          <label htmlFor="task-description">Pourquoi (optionnel)</label>
          <textarea id="task-description" className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className={styles.chips}>
          <Chip active={isUrgent} onClick={() => setIsUrgent(!isUrgent)}>Urgent</Chip>
          <Chip active={isPrivate} onClick={() => setIsPrivate(!isPrivate)}>Privé</Chip>
        </div>

        {canAddBudget && (
          <div className={styles.field} style={{ marginTop: 12 }}>
            <div className={styles.chips}>
              <Chip active={withBudget} onClick={() => setWithBudget(!withBudget)}>Ajouter un budget à cette tâche</Chip>
            </div>
            {withBudget && (
              <div className={styles.row} style={{ marginTop: 8 }}>
                <div className={styles.field}>
                  <label htmlFor="task-budget-amount">Montant</label>
                  <input
                    id="task-budget-amount"
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                  />
                </div>
                {budgetCategories.length > 0 && (
                  <div className={styles.field}>
                    <label htmlFor="task-budget-category">Catégorie</label>
                    <select
                      id="task-budget-category"
                      className={styles.input}
                      value={budgetCategoryId || budgetCategories[0].id}
                      onChange={(e) => setBudgetCategoryId(e.target.value)}
                    >
                      {budgetCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.submit} onClick={submit} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
