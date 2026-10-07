"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { getStore } from "@/shared/data/getStore";
import { useAppData } from "@/shared/session/AppDataContext";
import { Avatar } from "@/shared/ui/Avatar";
import { BlurInput, fieldStyle } from "@/shared/ui/BlurInput";
import { Card } from "@/shared/ui/Card";
import { PillButton } from "@/shared/ui/PillButton";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { paletteSoftColor } from "@/shared/design-tokens/palettes";
import { formatMoney } from "@/shared/lib/money";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { toggleTaskCompletion } from "@/domains/motivation/repository";
import { TaskRow } from "@/domains/tasks/components/TaskRow";
import { TaskSheet } from "@/domains/tasks/components/TaskSheet";
import type { TaskView } from "@/domains/tasks/types";
import { templateLabel } from "../defaults";
import { useSujetDetail } from "../hooks";
import {
  addComment,
  addLink,
  closeSujet,
  removeLink,
  reopenSujet,
  setSujetParticipants,
  updateSujet,
} from "../repository";
import { allowedParticipantIds } from "../services/sujetRules";
import {
  CLOSURE_MODES,
  CLOSURE_MODE_LABELS,
  SUJET_VISIBILITIES,
  SUJET_VISIBILITY_LABELS,
  type SujetDetailView,
} from "../types";

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const labelStyle = { fontSize: 11.5, color: "var(--fa-muted)", margin: "10px 0 6px" } as const;
const rowStyle = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" } as const;
const badge = { fontSize: 11.5, background: "var(--fa-tint)", borderRadius: 999, padding: "2px 9px" } as const;

function Block({ title, radius, children }: { title: string; radius: string; children: ReactNode }) {
  return (
    <Card radius={radius} style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, marginBottom: 6 }}>{title}</div>
      {children}
    </Card>
  );
}

export function SujetDetail({ sujetId }: { sujetId: string }) {
  const { member, family, members } = useAppData();
  const sujet = useSujetDetail(family.id, sujetId, member.id);

  if (sujet === undefined) return null;
  if (sujet === null) {
    return (
      <div>
        <Link href="/sujets" style={{ fontSize: 13.5 }}>← Sujets</Link>
        <p style={{ fontSize: 13.5, color: "var(--fa-muted)", marginTop: 12 }}>Ce Sujet n&rsquo;existe pas ou tu n&rsquo;y as pas accès.</p>
      </div>
    );
  }

  return <SujetBody sujet={sujet} familyId={family.id} viewerId={member.id} currency={family.currency} allMembers={members} />;
}

function SujetBody({
  sujet,
  familyId,
  viewerId,
  currency,
  allMembers,
}: {
  sujet: SujetDetailView;
  familyId: string;
  viewerId: string;
  currency: string;
  allMembers: Array<{ id: string; name: string; role: "parent" | "enfant" }>;
}) {
  const store = getStore();
  const [taskOpen, setTaskOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsDate, setNeedsDate] = useState(false);
  const [reopenDate, setReopenDate] = useState("");
  const [comment, setComment] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const open = sujet.status === "ouvert";
  const creatorId = sujet.creator?.id ?? viewerId;
  const participantIds = sujet.participants.map((participant) => participant.id);
  const allowed = allowedParticipantIds(sujet.visibility, creatorId, allMembers);
  const candidates = allMembers.filter((candidate) => allowed.includes(candidate.id));
  const everyone = candidates.every((candidate) => participantIds.includes(candidate.id));
  const pct = sujet.taskCount === 0 ? 0 : Math.round((sujet.doneCount / sujet.taskCount) * 100);
  const kind = templateLabel(sujet.template);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    }
  };

  const toggleTask = (task: TaskView) =>
    run(() =>
      toggleTaskCompletion(store, {
        familyId,
        taskId: task.id,
        subjectId: task.participants[0]?.id ?? viewerId,
        actorId: viewerId,
        completed: !task.done,
      })
    );

  const toggleParticipant = (id: string) =>
    run(() =>
      setSujetParticipants(store, sujet.id, participantIds.includes(id) ? participantIds.filter((p) => p !== id) : [...participantIds, id], viewerId)
    );

  const tryReopen = () =>
    run(async () => {
      try {
        await reopenSujet(store, sujet.id, viewerId, needsDate ? reopenDate || null : undefined);
        setNeedsDate(false);
      } catch (e) {
        if (e instanceof Error && e.message.includes("nouvelle date")) setNeedsDate(true);
        throw e;
      }
    });

  return (
    <div>
      <Link href="/sujets" style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fa-muted)" }}>
        <ArrowLeft size={15} /> Sujets
      </Link>

      <div style={{ margin: "10px 0 8px" }}>
        {sujet.canEdit && open ? (
          <BlurInput label="Titre du Sujet" value={sujet.title} onCommit={(title) => run(() => updateSujet(store, sujet.id, { title }))} />
        ) : (
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 24 }}>{sujet.title}</div>
        )}
      </div>

      <div style={{ ...rowStyle, marginBottom: 12 }}>
        {kind && <span style={badge}>{kind}</span>}
        <span style={badge}>{SUJET_VISIBILITY_LABELS[sujet.visibility]}</span>
        {!open && <span style={badge}>Clôturé</span>}
        <span style={{ display: "flex", gap: 4 }}>
          {sujet.participants.map((participant) => (
            <Avatar key={participant.id} name={participant.name} color={paletteSoftColor(participant.signatureColor)} size={24} />
          ))}
        </span>
      </div>

      {sujet.taskCount > 0 && (
        <div style={{ marginBottom: 14 }}>
          <ProgressBar label={`${sujet.doneCount} / ${sujet.taskCount} tâche${sujet.taskCount > 1 ? "s" : ""}`} pct={pct} fillColor="var(--fa-accent)" />
        </div>
      )}

      {sujet.description && <p style={{ fontSize: 14, margin: "0 0 14px" }}>{sujet.description}</p>}

      <Block title="Tâches" radius="30px 14px 26px 18px">
        {sujet.tasks.length === 0 && <p style={{ fontSize: 13, color: "var(--fa-muted)", margin: "4px 0 10px" }}>Aucune tâche pour l&rsquo;instant.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "8px 0 12px" }}>
          {sujet.tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggleTask} />
          ))}
        </div>
        {open && isParticipant(sujet, viewerId) && (
          <PillButton variant="secondary" onClick={() => setTaskOpen(true)}>+ Ajouter une tâche</PillButton>
        )}
      </Block>

      {sujet.budget && (
        <Block title="Budget lié" radius="16px 28px 14px 26px">
          <div style={{ fontSize: 14 }}>
            {formatMoney(sujet.budget.validated, currency)} validé
            {sujet.budget.pending > 0 && ` · ${formatMoney(sujet.budget.pending, currency)} à valider`}
          </div>
          <div style={{ fontSize: 12, color: "var(--fa-muted)", marginTop: 2 }}>Dépenses rattachées aux tâches de ce Sujet.</div>
        </Block>
      )}

      <Block title="Échanges" radius="26px 16px 30px 14px">
        {sujet.comments.length === 0 && <p style={{ fontSize: 13, color: "var(--fa-muted)", margin: "4px 0 10px" }}>Personne n&rsquo;a encore écrit.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "8px 0 12px" }}>
          {sujet.comments.map((item) => (
            <div key={item.id} style={{ display: "flex", gap: 10 }}>
              <Avatar name={item.author?.name ?? "?"} color={paletteSoftColor(item.author?.signatureColor ?? "")} size={28} />
              <div>
                <div style={{ fontSize: 12, color: "var(--fa-muted)" }}>
                  {item.author?.name ?? "Quelqu'un"} · {DATE_TIME.format(new Date(item.createdAt))}
                </div>
                <div style={{ fontSize: 14 }}>{item.content}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={fieldStyle}
            aria-label="Écrire un message"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && comment.trim() && run(async () => { await addComment(store, sujet.id, viewerId, comment); setComment(""); })}
            placeholder="Écrire un message…"
          />
          <PillButton
            variant="primary"
            disabled={!comment.trim()}
            onClick={() => run(async () => { await addComment(store, sujet.id, viewerId, comment); setComment(""); })}
          >
            Envoyer
          </PillButton>
        </div>
      </Block>

      <Block title="Liens" radius="14px 30px 18px 26px">
        {sujet.links.map((link) => (
          <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 14 }}>
            <ExternalLink size={15} />
            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{link.label}</a>
            {sujet.canEdit && (
              <button onClick={() => run(() => removeLink(store, link.id))} aria-label={`Retirer le lien ${link.label}`} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--fa-muted)" }}>
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <input style={fieldStyle} aria-label="Nom du lien" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Nom (optionnel)" />
          <div style={{ display: "flex", gap: 8 }}>
            <input style={fieldStyle} aria-label="Adresse du lien" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            <PillButton
              disabled={!linkUrl.trim()}
              onClick={() => run(async () => { await addLink(store, sujet.id, viewerId, linkLabel, linkUrl); setLinkLabel(""); setLinkUrl(""); })}
            >
              Ajouter
            </PillButton>
          </div>
        </div>
      </Block>

      {sujet.canEdit && (
        <Block title="Réglages du Sujet" radius="28px 14px 30px 16px">
          <div style={labelStyle}>Qui le voit ?</div>
          <div style={rowStyle}>
            {SUJET_VISIBILITIES.map((visibility) => (
              <Chip key={visibility} active={sujet.visibility === visibility} onClick={() => run(() => updateSujet(store, sujet.id, { visibility }))}>
                {SUJET_VISIBILITY_LABELS[visibility]}
              </Chip>
            ))}
          </div>

          {candidates.length > 1 && (
            <>
              <div style={labelStyle}>Participants</div>
              <div style={rowStyle}>
                <Chip
                  active={everyone}
                  onClick={() => run(() => setSujetParticipants(store, sujet.id, everyone ? [creatorId] : candidates.map((candidate) => candidate.id), viewerId))}
                >
                  Toute la famille
                </Chip>
                {candidates.filter((candidate) => candidate.id !== creatorId).map((candidate) => (
                  <Chip key={candidate.id} active={participantIds.includes(candidate.id)} onClick={() => toggleParticipant(candidate.id)}>
                    {candidate.name}
                  </Chip>
                ))}
              </div>
            </>
          )}

          <div style={labelStyle}>Clôture</div>
          <div style={rowStyle}>
            {CLOSURE_MODES.map((mode) => (
              <Chip
                key={mode}
                active={sujet.closureMode === mode}
                onClick={() => run(() => updateSujet(store, sujet.id, { closureMode: mode }))}
              >
                {CLOSURE_MODE_LABELS[mode]}
              </Chip>
            ))}
          </div>
          <div style={labelStyle}>{sujet.closureMode === "auto_after_date" ? "Date (clôture le lendemain)" : "Date (optionnel)"}</div>
          <BlurInput
            label="Date du Sujet"
            type="date"
            value={sujet.eventDate ?? ""}
            onCommit={(eventDate) => run(() => updateSujet(store, sujet.id, { eventDate: eventDate || null }))}
          />

          <div style={{ marginTop: 14 }}>
            {open ? (
              <PillButton variant="ghost" onClick={() => run(() => closeSujet(store, sujet.id, viewerId))}>Clôturer le Sujet</PillButton>
            ) : (
              <>
                {needsDate && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Nouvelle date de fin</div>
                    <input style={fieldStyle} aria-label="Nouvelle date de fin" type="date" value={reopenDate} onChange={(e) => setReopenDate(e.target.value)} />
                  </div>
                )}
                <PillButton variant="primary" onClick={tryReopen}>Rouvrir le Sujet</PillButton>
              </>
            )}
          </div>
        </Block>
      )}

      {error && <div style={{ fontSize: 12.5, color: "var(--fa-alert)", marginBottom: 12 }}>{error}</div>}

      <TaskSheet
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        sujetId={sujet.id}
        assignableIds={participantIds}
        sujetPrivate={sujet.visibility === "prive"}
      />
    </div>
  );
}

function isParticipant(sujet: SujetDetailView, viewerId: string): boolean {
  return sujet.participants.some((participant) => participant.id === viewerId);
}
