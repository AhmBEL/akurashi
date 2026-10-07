import Link from "next/link";
import { Avatar } from "@/shared/ui/Avatar";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { paletteSoftColor } from "@/shared/design-tokens/palettes";
import { parseDateString } from "@/shared/lib/date";
import { templateLabel } from "../defaults";
import { SUJET_VISIBILITY_LABELS, type SujetCardView } from "../types";

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

const badge = { fontSize: 11.5, background: "var(--fa-tint)", borderRadius: 999, padding: "2px 9px" } as const;

// Carte d'un Sujet dans la liste : modèle, date, visibilité, participants, avancement des tâches.
export function SujetCard({ sujet }: { sujet: SujetCardView }) {
  const { doneCount: done, taskCount: total } = sujet;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const kind = templateLabel(sujet.template);

  return (
    <Link href={`/sujets/${sujet.id}`} style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: 12 }}>
      <Card radius="30px 14px 28px 18px">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{sujet.title}</div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {sujet.participants.slice(0, 4).map((participant) => (
              <Avatar key={participant.id} name={participant.name} color={paletteSoftColor(participant.signatureColor)} size={26} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
          {kind && <span style={badge}>{kind}</span>}
          <span style={badge}>{SUJET_VISIBILITY_LABELS[sujet.visibility]}</span>
          {sujet.eventDate && <span style={badge}>{DATE_FORMAT.format(parseDateString(sujet.eventDate))}</span>}
          {sujet.status === "archive" && <span style={badge}>Clôturé</span>}
        </div>

        {total > 0 ? (
          <ProgressBar label={`${done} / ${total} tâche${total > 1 ? "s" : ""}`} pct={pct} fillColor="var(--fa-accent)" />
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--fa-muted)" }}>Aucune tâche pour l&rsquo;instant</div>
        )}
      </Card>
    </Link>
  );
}
