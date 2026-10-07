import { parseDateString } from "@/shared/lib/date";
import type { AgendaEntry } from "../types";

interface MonthViewProps {
  grid: string[][];
  month: number; // 0-11, pour atténuer les jours des mois voisins
  entries: Map<string, AgendaEntry[]>;
  today: string;
  colorOf: (ownerId: string | null) => string;
  onPickDay: (date: string) => void;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// Grille du mois : une pastille de couleur par personne concernée, jour courant repéré.
export function MonthView({ grid, month, entries, today, colorOf, onPickDay }: MonthViewProps) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {WEEKDAYS.map((label, index) => (
          <div key={index} style={{ textAlign: "center", fontSize: 11.5, color: "var(--fa-muted)" }}>{label}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {grid.flat().map((date) => {
          const day = parseDateString(date);
          const dayEntries = entries.get(date) ?? [];
          const owners = [...new Set(dayEntries.map((entry) => entry.ownerId))].slice(0, 4);
          const isToday = date === today;
          return (
            <button
              key={date}
              onClick={() => onPickDay(date)}
              aria-label={`${day.getDate()} — ${dayEntries.length} élément${dayEntries.length > 1 ? "s" : ""}`}
              data-today={isToday || undefined}
              style={{
                minHeight: 52,
                borderRadius: "14px 8px 14px 8px",
                border: isToday ? "2px solid var(--fa-accent)" : "1px solid var(--fa-line)",
                background: "var(--fa-surface)",
                opacity: day.getMonth() === month ? 1 : 0.45,
                padding: "5px 2px",
                cursor: "pointer",
                font: "inherit",
                color: "var(--fa-text)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{day.getDate()}</span>
              <span style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                {owners.map((ownerId) => (
                  <span key={ownerId ?? "none"} style={{ width: 7, height: 7, borderRadius: 999, background: colorOf(ownerId) }} />
                ))}
              </span>
              {dayEntries.length > 1 && <span style={{ fontSize: 10, color: "var(--fa-muted)" }}>{dayEntries.length}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
