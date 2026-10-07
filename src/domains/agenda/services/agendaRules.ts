import { PALETTES, isPaletteKey, type PaletteKey } from "@/shared/design-tokens/palettes";
import { parseDateString, startOfWeek, toDateString } from "@/shared/lib/date";
import { weekdayIndex } from "@/domains/tasks/services/taskRules";
import type { AgendaTask } from "@/domains/tasks/types";
import type { AgendaEntry, AgendaViewKey, BusyBand } from "../types";

// Règles de l'agenda, pures (sans store ni horloge implicite) : l'agenda ne
// stocke rien, il place les tâches datées sur le calendrier.

export const hhmm = (time: string | null): string | null => (time ? time.slice(0, 5) : null);

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export const minutesOf = (date: Date): number => date.getHours() * 60 + date.getMinutes();

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Une ponctuelle tombe sur sa date ; une récurrente (avec heure) chaque semaine,
// aux jours choisis, à partir de sa date de début si elle en a une.
function occursOn(task: AgendaTask, date: string): boolean {
  if (task.recurrenceDays.length > 0) {
    if (!task.dueTime) return false;
    if (task.dueDate && date < task.dueDate) return false;
    return task.recurrenceDays.includes(weekdayIndex(parseDateString(date)));
  }
  return task.dueDate === date;
}

export function entriesOnDate(tasks: AgendaTask[], date: string, today: string): AgendaEntry[] {
  return tasks
    .filter((task) => occursOn(task, date))
    .map((task): AgendaEntry => {
      const recurring = task.recurrenceDays.length > 0;
      return {
        taskId: task.id,
        task,
        date,
        startTime: hhmm(task.dueTime),
        endTime: hhmm(task.dueEndTime),
        ownerId: task.participants[0]?.id ?? task.creator?.id ?? null,
        // Une récurrente cochée l'est pour aujourd'hui seulement.
        done: recurring ? date === today && task.done : task.done,
        busyOnly: task.busyOnly,
      };
    })
    .sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.task.title.localeCompare(b.task.title, "fr"));
}

// Dates (incluses) de `from` à `to`.
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let day = parseDateString(from); toDateString(day) <= to; day = addDays(day, 1)) dates.push(toDateString(day));
  return dates;
}

export function entriesByDate(tasks: AgendaTask[], from: string, to: string, today: string): Map<string, AgendaEntry[]> {
  return new Map(datesBetween(from, to).map((date) => [date, entriesOnDate(tasks, date, today)]));
}

// Temps occupé : un élément avec début ET fin, fusionné par personne quand les créneaux se chevauchent.
export function busyBands(entries: AgendaEntry[]): BusyBand[] {
  const byOwner = new Map<string | null, BusyBand[]>();
  for (const entry of entries) {
    if (!entry.startTime || !entry.endTime) continue;
    const list = byOwner.get(entry.ownerId) ?? [];
    list.push({ ownerId: entry.ownerId, startMin: timeToMinutes(entry.startTime), endMin: timeToMinutes(entry.endTime) });
    byOwner.set(entry.ownerId, list);
  }
  const merged: BusyBand[] = [];
  for (const bands of byOwner.values()) {
    bands.sort((a, b) => a.startMin - b.startMin);
    for (const band of bands) {
      const last = merged.length > 0 ? merged[merged.length - 1] : undefined;
      if (last && last.ownerId === band.ownerId && band.startMin <= last.endMin) last.endMin = Math.max(last.endMin, band.endMin);
      else merged.push({ ...band });
    }
  }
  return merged;
}

// Les 7 jours (lundi → dimanche) de la semaine de `date`.
export function weekDates(date: Date): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => toDateString(addDays(monday, i)));
}

// Grille du mois en semaines complètes (lundi → dimanche).
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: string[][] = [];
  for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) weeks.push(weekDates(monday));
  return weeks;
}

// Navigation : un mois, une semaine ou un jour plus tôt / plus tard.
export function shiftAnchor(anchor: Date, view: AgendaViewKey, delta: number): Date {
  if (view === "mois") return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
  return addDays(anchor, delta * (view === "semaine" ? 7 : 1));
}

// Une couleur de palette par personne : la sienne si elle est libre, sinon la
// première libre (les enfants héritent de la couleur d'un parent à l'onboarding).
export function assignMemberColors(members: Array<{ id: string; role: "parent" | "enfant"; signatureColor: string }>): Record<string, PaletteKey> {
  const keys = Object.keys(PALETTES) as PaletteKey[];
  const used = new Set<PaletteKey>();
  const result: Record<string, PaletteKey> = {};
  const ordered = [...members].sort((a, b) => Number(a.role === "enfant") - Number(b.role === "enfant"));
  for (const member of ordered) {
    const own = isPaletteKey(member.signatureColor) ? member.signatureColor : null;
    const pick = own && !used.has(own) ? own : (keys.find((key) => !used.has(key)) ?? own ?? keys[0]);
    used.add(pick);
    result[member.id] = pick;
  }
  return result;
}

export interface PlacedEntry {
  entry: AgendaEntry;
  startMin: number;
  endMin: number; // sans heure de fin, on réserve une heure pour l'affichage
  column: number;
  columns: number; // nombre de colonnes du groupe de chevauchement
}

// Place côte à côte les éléments horaires qui se chevauchent dans une journée.
export function layoutDay(entries: AgendaEntry[]): PlacedEntry[] {
  const timed = entries
    .filter((entry) => entry.startTime)
    .map((entry) => {
      const startMin = timeToMinutes(entry.startTime as string);
      const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
      return { entry, startMin, endMin, column: 0, columns: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  let group: typeof timed = [];
  let groupEnd = -1;
  const closeGroup = () => {
    const columns = group.reduce((max, item) => Math.max(max, item.column + 1), 1);
    for (const item of group) item.columns = columns;
    group = [];
  };
  for (const item of timed) {
    if (group.length > 0 && item.startMin >= groupEnd) closeGroup();
    const used = new Set(group.filter((other) => other.endMin > item.startMin).map((other) => other.column));
    while (used.has(item.column)) item.column += 1;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.endMin);
  }
  closeGroup();
  return timed;
}
