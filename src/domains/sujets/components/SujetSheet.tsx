"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { getStore } from "@/shared/data/getStore";
import { useAppData } from "@/shared/session/AppDataContext";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { SUJET_TEMPLATES } from "../defaults";
import { createSujet } from "../repository";
import { allowedParticipantIds } from "../services/sujetRules";
import {
  CLOSURE_MODES,
  CLOSURE_MODE_LABELS,
  SUJET_VISIBILITIES,
  SUJET_VISIBILITY_LABELS,
  type ClosureMode,
  type SujetTemplateKey,
  type SujetVisibility,
} from "../types";
import styles from "./SujetSheet.module.css";

interface SujetSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (sujetId: string) => void;
}

// Ouverture d'un Sujet (04-ecrans §6) : un modèle pré-remplit le titre et des
// tâches suggérées, toutes modifiables ou supprimables avant la création.
export function SujetSheet({ open, onClose, onCreated }: SujetSheetProps) {
  const { member, members } = useAppData();
  const [template, setTemplate] = useState<SujetTemplateKey | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [visibility, setVisibility] = useState<SujetVisibility>("famille");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [closureMode, setClosureMode] = useState<ClosureMode>("manuel");
  const [eventDate, setEventDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const others = members.filter(
    (candidate) => candidate.id !== member.id && allowedParticipantIds(visibility, member.id, members).includes(candidate.id)
  );
  const everyone = others.length > 0 && others.every((candidate) => participantIds.includes(candidate.id));

  const chooseTemplate = (key: SujetTemplateKey) => {
    const chosen = SUJET_TEMPLATES.find((candidate) => candidate.key === key);
    if (!chosen) return;
    const previousHint = SUJET_TEMPLATES.find((candidate) => candidate.key === template)?.titleHint;
    setTemplate(key);
    setTasks(chosen.tasks);
    if (key !== "autre" && (title === "" || title === previousHint)) setTitle(chosen.titleHint);
    if (key === "autre" && title === previousHint) setTitle("");
  };

  const toggleParticipant = (id: string) =>
    setParticipantIds((ids) => (ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id]));

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((current) => [...current, newTask.trim()]);
    setNewTask("");
  };

  const reset = () => {
    setTemplate(null);
    setTitle("");
    setDescription("");
    setTasks([]);
    setNewTask("");
    setVisibility("famille");
    setParticipantIds([]);
    setClosureMode("manuel");
    setEventDate("");
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const id = await createSujet(getStore(), {
          familyId: member.familyId,
          creatorId: member.id,
          title,
          description,
          template,
          visibility,
          participantIds,
          closureMode,
          eventDate: eventDate || null,
          suggestedTasks: tasks,
        });
        reset();
        onClose();
        onCreated?.(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer le Sujet");
      }
    });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.cancel} onClick={onClose}>Annuler</button>
          <div className={styles.headTitle}>Nouveau Sujet</div>
          <span style={{ width: 44 }} />
        </div>

        <div className={styles.field}>
          <label>Pour démarrer</label>
          <div className={styles.chips}>
            {SUJET_TEMPLATES.map((candidate) => (
              <Chip key={candidate.key} active={template === candidate.key} onClick={() => chooseTemplate(candidate.key)}>
                {candidate.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="sujet-title">Titre</label>
          <input id="sujet-title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Anniversaire de Lou" />
        </div>

        <div className={styles.field}>
          <label>Tâches suggérées</label>
          {tasks.length === 0 && <div className={styles.hint}>Aucune pour l&rsquo;instant : ajoutes-en ci-dessous, ou plus tard dans le Sujet.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map((task, index) => (
              <div key={`${task}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ flex: 1 }}>{task}</span>
                <button
                  onClick={() => setTasks((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Retirer « ${task} »`}
                  style={{ background: "none", border: 0, cursor: "pointer", color: "var(--fa-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              aria-label="Nouvelle tâche suggérée"
              className={styles.input}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Ajouter une tâche"
            />
            <button className={styles.cancel} onClick={addTask}>Ajouter</button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="sujet-description">Description (optionnel)</label>
          <textarea id="sujet-description" className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label>Qui le voit ?</label>
          <div className={styles.chips}>
            {SUJET_VISIBILITIES.map((candidate) => (
              <Chip key={candidate} active={visibility === candidate} onClick={() => setVisibility(candidate)}>
                {SUJET_VISIBILITY_LABELS[candidate]}
              </Chip>
            ))}
          </div>
        </div>

        {others.length > 0 && (
          <div className={styles.field}>
            <label>Participants</label>
            <div className={styles.chips}>
              <Chip active={everyone} onClick={() => setParticipantIds(everyone ? [] : others.map((candidate) => candidate.id))}>
                Toute la famille
              </Chip>
              {others.map((candidate) => (
                <Chip key={candidate.id} active={participantIds.includes(candidate.id)} onClick={() => toggleParticipant(candidate.id)}>
                  {candidate.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label>Clôture</label>
          <div className={styles.chips}>
            {CLOSURE_MODES.map((mode) => (
              <Chip key={mode} active={closureMode === mode} onClick={() => setClosureMode(mode)}>
                {CLOSURE_MODE_LABELS[mode]}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="sujet-date">{closureMode === "auto_after_date" ? "Date de l'événement (clôture le lendemain)" : "Date (optionnel)"}</label>
          <input id="sujet-date" className={styles.input} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.submit} onClick={submit} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Créer le Sujet"}
        </button>
      </div>
    </div>
  );
}
