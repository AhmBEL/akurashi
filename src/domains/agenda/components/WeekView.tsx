import { Card } from "@/shared/ui/Card";
import { parseDateString } from "@/shared/lib/date";
import { busyBands } from "../services/agendaRules";
import type { AgendaEntry } from "../types";

interface WeekViewProps {
  dates: string[];
  entries: Map<string, AgendaEntry[]>;
  today: string;
  colorOf: (ownerId: string | null) => string;
  onPickDay: (date: string) => void;
}

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
const STRIP_FROM = 6 * 60;
const STRIP_TO = 23 * 60;

// Semaine : une ligne par jour, avec une fine bande d'occupation (6 h – 23 h) puis les éléments.
export function WeekView({ dates, entries, today, colorOf, onPickDay }: WeekViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {dates.map((date) => {
        const dayEntries = entries.get(date) ?? [];
        const bands = busyBands(dayEntries);
        const isToday = date === today;
        return (
          <button
            key={date}
            onClick={() => onPickDay(date)}
            data-today={isToday || undefined}
            aria-label={`Ouvrir ${DAY_FORMAT.format(parseDateString(date))}`}
            style={{ all: "unset", cursor: "pointer", display: "block" }}
          >
            <Card radius="22px 12px 20px 14px" style={{ padding: "10px 14px", border: isToday ? "2px solid var(--fa-accent)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, textTransform: "capitalize" }}>
                  {DAY_FORMAT.format(parseDateString(date))}
                </span>
                {isToday && <span style={{ fontSize: 11.5, color: "var(--fa-accent)" }}>Aujourd&rsquo;hui</span>}
              </div>

              <div style={{ position: "relative", height: 6, borderRadius: 999, background: "var(--fa-line)", margin: "6px 0 8px", overflow: "hidden" }}>
                {bands.map((band, index) => (
                  <span
                    key={index}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${(Math.max(band.startMin, STRIP_FROM) - STRIP_FROM) / (STRIP_TO - STRIP_FROM) * 100}%`,
                      width: `${Math.max(0, Math.min(band.endMin, STRIP_TO) - Math.max(band.startMin, STRIP_FROM)) / (STRIP_TO - STRIP_FROM) * 100}%`,
                      background: colorOf(band.ownerId),
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>

              {dayEntries.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--fa-muted)" }}>Rien de prévu</div>
              ) : (
                dayEntries.map((entry) => (
                  <div key={`${entry.taskId}-${entry.date}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, padding: "2px 0" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(entry.ownerId), flexShrink: 0 }} />
                    <span style={{ color: "var(--fa-muted)", minWidth: 78, fontSize: 12 }}>
                      {entry.startTime ? (entry.endTime ? `${entry.startTime} – ${entry.endTime}` : entry.startTime) : "Sans heure"}
                    </span>
                    <span style={{ textDecoration: entry.done ? "line-through" : undefined, opacity: entry.done ? 0.55 : 1 }}>
                      {entry.task.title}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
