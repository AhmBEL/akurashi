"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { getStore } from "@/shared/data/getStore";
import { BlurInput, fieldStyle } from "@/shared/ui/BlurInput";
import { PillButton } from "@/shared/ui/PillButton";
import { toMinorUnits } from "@/shared/lib/money";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { removeCharge, setChargeAmount, toggleChargePaid, updateCharge, type ChargeRowView } from "../repository";
import { Amount } from "./Amount";

interface ChargeRowProps {
  charge: ChargeRowView;
  currency: string;
  hidden: boolean;
  periodStart: string;
}

const PERIODICITY_LABEL = { mensuel: "", trimestriel: " · tous les 3 mois", annuel: " · chaque année" } as const;

function stateLabel(charge: ChargeRowView): string {
  if (charge.state === "payee") return charge.autoPaid ? `Prélevé le ${charge.debitDay}` : "Fait";
  if (charge.state === "a_venir") return `Prélèvement le ${charge.debitDay} — à venir`;
  return "À faire";
}

// Une charge de la période : son état (rouge tant qu'elle n'est ni cochée, ni
// prélevée), son montant, et ses réglages (prélèvement, jour, suppression).
export function ChargeRow({ charge, currency, hidden, periodStart }: ChargeRowProps) {
  const store = getStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const variable = charge.financialType === "fixe_variable";

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--fa-line)", padding: "11px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{ width: 11, height: 11, borderRadius: 999, flexShrink: 0, background: charge.paid ? "var(--fa-ok)" : "var(--fa-alert)" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5 }}>
            {charge.name}
            <span style={{ fontSize: 11.5, color: "var(--fa-muted)" }}>{PERIODICITY_LABEL[charge.periodicity]}</span>
          </div>
          <div style={{ fontSize: 12, color: charge.paid ? "var(--fa-ok)" : "var(--fa-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            {charge.paid && <Check size={13} strokeWidth={3} />}
            {stateLabel(charge)}
          </div>
        </div>
        <div style={{ fontSize: 14, textAlign: "right" }}>
          {charge.amountSet ? <Amount value={charge.amount} currency={currency} hidden={hidden} /> : <span style={{ color: "var(--fa-muted)", fontSize: 12 }}>à saisir</span>}
        </div>
        {!charge.isDirectDebit && (
          <PillButton
            variant={charge.paid ? "ghost" : "primary"}
            aria-label={`${charge.paid ? "Décocher" : "Cocher"} ${charge.name}`}
            onClick={() => run(() => toggleChargePaid(store, charge.lineId, periodStart, !charge.paid))}
          >
            {charge.paid ? "Annuler" : "Fait"}
          </PillButton>
        )}
        <button
          onClick={() => setOpen(!open)}
          aria-label={`Réglages de ${charge.name}`}
          aria-expanded={open}
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--fa-muted)", fontSize: 18, padding: "0 4px" }}
        >
          ⋯
        </button>
      </div>

      {variable && !hidden && (
        <div style={{ marginTop: 8 }}>
          <BlurInput
            label={`Montant du mois (${charge.name})`}
            type="number"
            value={charge.amountSet ? String(charge.amount / 100) : ""}
            onCommit={(value) => run(() => setChargeAmount(store, charge.lineId, periodStart, value === "" ? null : toMinorUnits(Number(value))))}
          />
        </div>
      )}

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Chip active={!charge.isDirectDebit} onClick={() => run(() => updateCharge(store, charge.lineId, { isDirectDebit: false }))}>
              À faire à la main
            </Chip>
            <Chip active={charge.isDirectDebit} onClick={() => run(() => updateCharge(store, charge.lineId, { isDirectDebit: true, debitDay: charge.debitDay ?? 1 }))}>
              Prélèvement
            </Chip>
            {charge.isDirectDebit && (
              <select
                style={{ ...fieldStyle, width: "auto" }}
                aria-label={`Jour de prélèvement (${charge.name})`}
                value={charge.debitDay ?? 1}
                onChange={(e) => run(() => updateCharge(store, charge.lineId, { isDirectDebit: true, debitDay: Number(e.target.value) }))}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>Le {day}</option>
                ))}
              </select>
            )}
          </div>
          {!variable && !hidden && (
            <BlurInput
              label={`Montant (${charge.name})`}
              type="number"
              value={String(charge.amount / 100)}
              onCommit={(value) => run(() => updateCharge(store, charge.lineId, { amountMinorUnits: toMinorUnits(Number(value) || 0) }))}
            />
          )}
          <div>
            <PillButton
              variant="ghost"
              onClick={() => window.confirm(`Supprimer la charge « ${charge.name} » ?`) && run(() => removeCharge(store, charge.lineId))}
            >
              Supprimer cette charge
            </PillButton>
          </div>
        </div>
      )}
      {error && <div style={{ fontSize: 12.5, color: "var(--fa-alert)", marginTop: 6 }}>{error}</div>}
    </div>
  );
}
