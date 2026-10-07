"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStore } from "@/shared/data/getStore";
import { PALETTES } from "@/shared/design-tokens/palettes";
import { now } from "@/shared/lib/clock";
import { parseDateString, toDateString } from "@/shared/lib/date";
import { useAppData } from "@/shared/session/AppDataContext";
import { PillButton } from "@/shared/ui/PillButton";
import { isModuleActive } from "@/domains/family/settings";
import { toggleTaskCompletion } from "@/domains/motivation/repository";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { TaskSheet } from "@/domains/tasks/components/TaskSheet";
import { useAgendaTasks } from "../hooks";
import { assignMemberColors, entriesByDate, minutesOf, monthGrid, shiftAnchor, weekDates } from "../services/agendaRules";
import { AGENDA_VIEWS, AGENDA_VIEW_LABELS, type AgendaEntry, type AgendaViewKey } from "../types";
import { DayView } from "./DayView";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const DAY_LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const DAY_SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

// Agenda : mois / semaine / jour, alimenté seul par les tâches datées.
export function AgendaScreen() {
  const { member, family, members } = useAppData();
  const tasks = useAgendaTasks(family.id, member.id);
  const [view, setView] = useState<AgendaViewKey>("mois");
  const [anchor, setAnchor] = useState<Date>(() => now());
  const [personId, setPersonId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const colors = useMemo(() => assignMemberColors(members), [members]);
  const colorOf = (ownerId: string | null) => (ownerId && colors[ownerId] ? PALETTES[colors[ownerId]].soft : "var(--fa-muted)");

  if (!isModuleActive(family.settings, "agenda")) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>
        L&rsquo;agenda est désactivé. Tu peux le réactiver dans <Link href="/reglages">Réglages</Link>.
      </p>
    );
  }
  if (member.role === "enfant" && member.accessStatus === "managed") {
    return <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>L&rsquo;agenda n&rsquo;est pas disponible sur cet appareil.</p>;
  }

  const current = now();
  const today = toDateString(current);
  const anchorKey = toDateString(anchor);

  const grid = monthGrid(anchor.getFullYear(), anchor.getMonth());
  const week = weekDates(anchor);
  const range = view === "mois" ? [grid[0][0], grid[grid.length - 1][6]] : view === "semaine" ? [week[0], week[6]] : [anchorKey, anchorKey];

  const shown = (tasks ?? []).filter(
    (task) => !personId || task.participants.some((p) => p.id === personId) || (task.participants.length === 0 && task.creator?.id === personId)
  );
  const entries = entriesByDate(shown, range[0], range[1], today);

  const label =
    view === "mois"
      ? MONTH_FORMAT.format(anchor)
      : view === "semaine"
        ? `${DAY_SHORT.format(parseDateString(week[0]))} – ${DAY_SHORT.format(parseDateString(week[6]))}`
        : DAY_LONG.format(anchor);

  const pickDay = (date: string) => {
    setAnchor(parseDateString(date));
    setView("jour");
  };

  const toggle = (entry: AgendaEntry) =>
    void toggleTaskCompletion(getStore(), {
      familyId: family.id,
      taskId: entry.taskId,
      subjectId: entry.task.participants[0]?.id ?? member.id,
      actorId: member.id,
      completed: !entry.done,
    });

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginBottom: 12 }}>Agenda</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {AGENDA_VIEWS.map((key) => (
          <Chip key={key} active={view === key} onClick={() => setView(key)}>
            {AGENDA_VIEW_LABELS[key]}
          </Chip>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <button aria-label="Précédent" onClick={() => setAnchor(shiftAnchor(anchor, view, -1))} style={navButton}>
          <ChevronLeft size={20} />
        </button>
        <div data-testid="agenda-label" style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600, textTransform: "capitalize" }}>{label}</div>
        <button aria-label="Suivant" onClick={() => setAnchor(shiftAnchor(anchor, view, 1))} style={navButton}>
          <ChevronRight size={20} />
        </button>
        <PillButton variant="ghost" onClick={() => setAnchor(now())}>Aujourd&rsquo;hui</PillButton>
      </div>

      {members.length > 1 && member.role === "parent" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <Chip active={personId === null} onClick={() => setPersonId(null)}>Toute la famille</Chip>
          {members.map((candidate) => (
            <Chip key={candidate.id} active={personId === candidate.id} onClick={() => setPersonId(personId === candidate.id ? null : candidate.id)}>
              <span aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: colorOf(candidate.id), marginRight: 6 }} />
              {candidate.name}
            </Chip>
          ))}
        </div>
      )}

      {view === "mois" && <MonthView grid={grid} month={anchor.getMonth()} entries={entries} today={today} colorOf={colorOf} onPickDay={pickDay} />}
      {view === "semaine" && <WeekView dates={week} entries={entries} today={today} colorOf={colorOf} onPickDay={pickDay} />}
      {view === "jour" && (
        <DayView entries={entries.get(anchorKey) ?? []} isToday={anchorKey === today} nowMinutes={minutesOf(current)} colorOf={colorOf} onToggle={toggle} />
      )}

      <PillButton variant="primary" block onClick={() => setCreating(true)} style={{ marginTop: 18 }}>
        + Rendez-vous
      </PillButton>
      <TaskSheet open={creating} onClose={() => setCreating(false)} defaultDate={anchorKey} />
    </div>
  );
}

const navButton = {
  background: "var(--fa-surface)",
  border: "1px solid var(--fa-line)",
  borderRadius: 999,
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--fa-text)",
} as const;
