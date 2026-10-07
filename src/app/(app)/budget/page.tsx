"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, CalendarCheck, Eye, EyeOff, Landmark, Zap, Siren, type LucideIcon } from "lucide-react";
import { useAppData } from "@/shared/session/AppDataContext";
import { parseDateString } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { Card } from "@/shared/ui/Card";
import { PillButton } from "@/shared/ui/PillButton";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { Amount } from "@/domains/budget/components/Amount";
import { ChargeRow } from "@/domains/budget/components/ChargeRow";
import { ChargeSheet } from "@/domains/budget/components/ChargeSheet";
import { ValidationList } from "@/domains/budget/components/ValidationList";
import { useBudgetPage } from "@/domains/budget/hooks";
import type { ExpenseView } from "@/domains/budget/repository";
import type { MonthStatus } from "@/domains/budget/types";

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" });

const STATUS: Record<MonthStatus, { color: string; label: string }> = {
  rouge: { color: "var(--fa-alert)", label: "Rien n'est encore réglé ce mois-ci" },
  orange: { color: "var(--fa-warn)", label: "Une partie des charges est réglée" },
  vert: { color: "var(--fa-ok)", label: "Tout est réglé, bravo !" },
};

const HISTORY_COLOR: Record<MonthStatus, string> = { rouge: "var(--fa-alert)", orange: "var(--fa-warn)", vert: "var(--fa-ok)" };

// Les quatre catégories du brief, chacune avec sa couleur, son icône et sa forme.
function Section({ title, hint, icon: Icon, tone, radius, children }: { title: string; hint?: string; icon: LucideIcon; tone: string; radius: string; children: ReactNode }) {
  return (
    <Card radius={radius} style={{ marginBottom: 14, borderLeft: `5px solid ${tone}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={18} strokeWidth={2.6} color={tone} aria-hidden="true" />
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{title}</div>
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--fa-muted)", margin: "2px 0 4px 26px" }}>{hint}</div>}
      <div style={{ marginTop: 6 }}>{children}</div>
    </Card>
  );
}

const empty = (text: string) => <p style={{ fontSize: 13, color: "var(--fa-muted)", margin: "6px 0 0" }}>{text}</p>;

function ExpenseList({ items, currency, hidden }: { items: ExpenseView[]; currency: string; hidden: boolean }) {
  if (items.length === 0) return empty("Rien pour cette période.");
  return (
    <div>
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid var(--fa-line)", padding: "10px 0" }}>
          <div>
            <div style={{ fontSize: 14.5 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: "var(--fa-muted)" }}>
              {item.categoryName} · {DAY_FORMAT.format(parseDateString(item.spentOn))}
              {item.status === "ajustee" && " · montant ajusté"}
              {item.linkedToTask && " · liée à une tâche"}
            </div>
          </div>
          <div style={{ fontSize: 14 }}>
            <Amount value={item.amount} currency={currency} hidden={hidden} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Écran Budget (brut) : statut du mois, charges par catégorie, jauges, historique.
export default function BudgetPage() {
  const { member, family } = useAppData();
  const data = useBudgetPage(family.id, member.id);
  const [hidden, setHidden] = useState(family.securityLevel === "accueil_protege");
  const [chargeOpen, setChargeOpen] = useState(false);

  if (member.role !== "parent") {
    return <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>Le budget est réservé aux parents.</p>;
  }
  if (!family.settings.budgetEnabled) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>
        Le budget est désactivé. Tu peux le réactiver dans <Link href="/reglages">Réglages</Link>.
      </p>
    );
  }
  if (!data) return null;

  const { currency } = data;
  const lastDay = parseDateString(data.nextPeriodStart);
  lastDay.setDate(lastDay.getDate() - 1);
  const status = data.status ? STATUS[data.status] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 24 }}>Budget</div>
          <div style={{ fontSize: 12.5, color: "var(--fa-muted)", marginTop: 2 }}>
            Du {DAY_FORMAT.format(parseDateString(data.periodStart))} au {DAY_FORMAT.format(lastDay)}
            {data.daysLeft > 0 && ` · encore ${data.daysLeft} jour${data.daysLeft > 1 ? "s" : ""}`}
          </div>
        </div>
        <button
          onClick={() => setHidden(!hidden)}
          title={hidden ? "Afficher les montants" : "Masquer les montants"}
          aria-label={hidden ? "Afficher les montants" : "Masquer les montants"}
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--fa-text)", padding: 6 }}
        >
          {hidden ? <EyeOff size={21} strokeWidth={2.4} /> : <Eye size={21} strokeWidth={2.4} />}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 16px" }}>
        <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: 999, background: status?.color ?? "var(--fa-line)" }} />
        <span data-testid="month-status" data-status={data.status ?? "aucune"} style={{ fontSize: 14 }}>
          {status ? status.label : "Aucune charge fixe à suivre pour l'instant"}
        </span>
      </div>

      {data.toValidate.length > 0 && (
        <Section title="À valider" hint="Dépenses proposées par un parent" icon={CalendarClock} tone="var(--fa-accent)" radius="30px 14px 28px 16px">
          <ValidationList items={data.toValidate} viewerId={member.id} currency={currency} hidden={hidden} />
        </Section>
      )}

      <Section title="Charges fixes" hint="Toujours le même montant" icon={Landmark} tone="var(--fa-accent)" radius="32px 14px 28px 18px">
        {data.fixedCharges.length === 0
          ? empty("Aucune charge fixe pour cette période.")
          : data.fixedCharges.map((charge) => <ChargeRow key={charge.lineId} charge={charge} currency={currency} hidden={hidden} periodStart={data.periodStart} />)}
      </Section>

      <Section title="Charges au montant variable" hint="Électricité, eau… on saisit le montant du mois" icon={Zap} tone="var(--fa-warn)" radius="18px 30px 14px 28px">
        {data.variableCharges.length === 0
          ? empty("Aucune charge variable pour cette période.")
          : data.variableCharges.map((charge) => <ChargeRow key={charge.lineId} charge={charge} currency={currency} hidden={hidden} periodStart={data.periodStart} />)}
      </Section>

      <div style={{ marginBottom: 14 }}>
        <PillButton variant="secondary" onClick={() => setChargeOpen(true)}>+ Ajouter une charge fixe</PillButton>
      </div>

      <Section title="Dépenses prévues" hint="Courses, loisirs… ce qu'on avait en tête" icon={CalendarCheck} tone="var(--fa-ok)" radius="28px 16px 32px 14px">
        <ExpenseList items={data.plannedExpenses} currency={currency} hidden={hidden} />
      </Section>

      <Section title="Dépenses imprévues" hint="Ce qui est arrivé sans prévenir" icon={Siren} tone="var(--fa-alert)" radius="14px 28px 18px 32px">
        <ExpenseList items={data.unplannedExpenses} currency={currency} hidden={hidden} />
      </Section>

      {data.gauges.length > 0 && (
        <Card radius="30px 16px 28px 14px" style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, marginBottom: 10 }}>Plafonds</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.gauges.map((gauge) => (
              <ProgressBar
                key={gauge.categoryId}
                label={
                  hidden
                    ? gauge.label
                    : gauge.targetAmount > 0
                      ? `${gauge.label} · ${formatMoney(gauge.spentAmount, currency)} / ${formatMoney(gauge.targetAmount, currency)}`
                      : `${gauge.label} · ${formatMoney(gauge.spentAmount, currency)}`
                }
                pct={gauge.pct}
                fillColor="var(--fa-accent)"
              />
            ))}
          </div>
        </Card>
      )}

      <Card radius="16px 30px 14px 26px" style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, marginBottom: 10 }}>Historique</div>
        {data.history.length === 0 ? (
          empty("Les mois écoulés apparaîtront ici.")
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.history.map((recap) => (
                <div key={recap.start} title={`${recap.paidCount} / ${recap.dueCount} charges réglées`} style={{ textAlign: "center", fontSize: 11 }}>
                  <div aria-label={`${MONTH_FORMAT.format(parseDateString(recap.start))} : ${recap.status}`} style={{ width: 34, height: 34, borderRadius: "12px 6px 12px 6px", background: HISTORY_COLOR[recap.status] }} />
                  <div style={{ color: "var(--fa-muted)", marginTop: 3 }}>{MONTH_FORMAT.format(parseDateString(recap.start))}</div>
                </div>
              ))}
            </div>
            {data.bilan && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{data.bilan.title}</div>
                <p style={{ fontSize: 13.5, margin: "4px 0" }}>{data.bilan.message}</p>
                <p style={{ fontSize: 13, color: "var(--fa-muted)", margin: 0 }}>{data.bilan.suggestion}</p>
              </div>
            )}
          </>
        )}
      </Card>

      <p style={{ fontSize: 13, color: "var(--fa-muted)" }}>
        Jour de remise à zéro, plafonds et raccourcis : <Link href="/reglages">Réglages → Budget</Link>.
      </p>

      <ChargeSheet open={chargeOpen} onClose={() => setChargeOpen(false)} />
    </div>
  );
}
