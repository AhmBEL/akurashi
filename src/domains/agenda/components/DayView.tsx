import { TaskRow } from "@/domains/tasks/components/TaskRow";
import { busyBands, layoutDay } from "../services/agendaRules";
import type { AgendaEntry } from "../types";

interface DayViewProps {
  entries: AgendaEntry[];
  isToday: boolean;
  nowMinutes: number;
  colorOf: (ownerId: string | null) => string;
  onToggle: (entry: AgendaEntry) => void;
}

const HOUR_HEIGHT = 52;
const LABEL_WIDTH = 42;
const pad = (n: number) => String(n).padStart(2, "0");

// Jour : frise horaire (éléments positionnés, temps occupé en bande de fond
// discrète, trait rouge « maintenant »), puis les éléments sans heure.
export function DayView({ entries, isToday, nowMinutes, colorOf, onToggle }: DayViewProps) {
  const placed = layoutDay(entries);
  const bands = busyBands(entries);
  const untimed = entries.filter((entry) => !entry.startTime);

  const starts = [...placed.map((p) => p.startMin), ...(isToday ? [nowMinutes] : [])];
  const ends = [...placed.map((p) => p.endMin), ...(isToday ? [nowMinutes] : [])];
  const fromHour = Math.min(6, Math.floor(Math.min(...starts, 6 * 60) / 60));
  const toHour = Math.max(22, Math.ceil(Math.max(...ends, 22 * 60) / 60));
  const top = (minutes: number) => ((minutes - fromHour * 60) / 60) * HOUR_HEIGHT;
  const hours = Array.from({ length: toHour - fromHour + 1 }, (_, i) => fromHour + i);

  return (
    <div>
      <div style={{ position: "relative", height: (toHour - fromHour) * HOUR_HEIGHT + 8 }}>
        {hours.map((hour) => (
          <div key={hour} style={{ position: "absolute", top: top(hour * 60), left: 0, right: 0, display: "flex", alignItems: "center" }}>
            <span style={{ width: LABEL_WIDTH, fontSize: 11, color: "var(--fa-muted)", transform: "translateY(-50%)" }}>{pad(hour)}:00</span>
            <span style={{ flex: 1, borderTop: "1px solid var(--fa-line)" }} />
          </div>
        ))}

        {/* Temps occupé : bande de fond, jamais un bloc. */}
        {bands.map((band, index) => (
          <div
            key={`band-${index}`}
            data-testid="busy-band"
            style={{
              position: "absolute",
              left: LABEL_WIDTH,
              right: 0,
              top: top(band.startMin),
              height: ((band.endMin - band.startMin) / 60) * HOUR_HEIGHT,
              background: colorOf(band.ownerId),
              opacity: 0.16,
              borderRadius: 8,
            }}
          />
        ))}

        {placed.map(({ entry, startMin, endMin, column, columns }) => {
          const color = colorOf(entry.ownerId);
          const interactive = !entry.busyOnly;
          return (
            <button
              key={`${entry.taskId}-${entry.date}`}
              onClick={() => interactive && onToggle(entry)}
              disabled={!interactive}
              aria-label={entry.busyOnly ? `Occupé à ${entry.startTime}` : `${entry.task.title} à ${entry.startTime}`}
              style={{
                position: "absolute",
                top: top(startMin) + 1,
                height: Math.max(26, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2),
                left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${column / columns} + 2px)`,
                width: `calc((100% - ${LABEL_WIDTH}px) / ${columns} - 4px)`,
                // Légèrement translucide : le temps occupé reste perceptible derrière.
                background: "color-mix(in srgb, var(--fa-surface) 86%, transparent)",
                border: "none",
                borderLeft: `4px solid ${color}`,
                borderRadius: "4px 12px 12px 4px",
                boxShadow: "var(--shadow-sm)",
                padding: "3px 8px",
                textAlign: "left",
                font: "inherit",
                fontSize: 12.5,
                color: "var(--fa-text)",
                cursor: interactive ? "pointer" : "default",
                overflow: "hidden",
                opacity: entry.done ? 0.55 : 1,
              }}
            >
              <div style={{ fontWeight: 600, textDecoration: entry.done ? "line-through" : undefined }}>{entry.task.title}</div>
              <div style={{ fontSize: 11, color: "var(--fa-muted)" }}>
                {entry.startTime}
                {entry.endTime ? ` – ${entry.endTime}` : ""}
              </div>
            </button>
          );
        })}

        {isToday && (
          <div data-testid="now-line" style={{ position: "absolute", top: top(nowMinutes), left: LABEL_WIDTH - 4, right: 0, display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--fa-alert)" }} />
            <span style={{ flex: 1, borderTop: "2px solid var(--fa-alert)" }} />
          </div>
        )}
      </div>

      {untimed.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: "var(--fa-muted)", marginBottom: 8 }}>Sans heure</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {untimed.map((entry) => (
              <TaskRow key={`${entry.taskId}-${entry.date}`} task={{ ...entry.task, done: entry.done }} onToggle={() => !entry.busyOnly && onToggle(entry)} />
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && <p style={{ fontSize: 13.5, color: "var(--fa-muted)", marginTop: 14 }}>Rien de prévu ce jour-là.</p>}
    </div>
  );
}
