"use client";

import { useState } from "react";
import { getStore } from "@/shared/data/getStore";
import { toMinorUnits } from "@/shared/lib/money";
import { PillButton } from "@/shared/ui/PillButton";
import { fieldStyle } from "@/shared/ui/BlurInput";
import { validateExpense, type ExpenseView } from "../repository";
import { Amount } from "./Amount";

interface ValidationListProps {
  items: ExpenseView[];
  viewerId: string;
  currency: string;
  hidden: boolean;
}

// « Dépenses à valider » : l'autre parent valide, ajuste le montant ou refuse.
export function ValidationList({ items, viewerId, currency, hidden }: ValidationListProps) {
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decide = async (item: ExpenseView, decision: "validee" | "ajustee" | "refusee", amount?: number) => {
    setError(null);
    try {
      await validateExpense(getStore(), { lineId: item.id, actorId: viewerId, decision, amountMinorUnits: amount });
      setAdjusting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    }
  };

  return (
    <div>
      {items.map((item) => {
        const mine = item.proposedById === viewerId;
        return (
          <div key={item.id} style={{ borderTop: "1px solid var(--fa-line)", padding: "11px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14.5 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--fa-muted)" }}>
                  {item.categoryName} · proposée par {mine ? "toi" : (item.proposedByName ?? "un parent")}
                </div>
              </div>
              <div style={{ fontSize: 14 }}>
                <Amount value={item.amount} currency={currency} hidden={hidden} />
              </div>
            </div>

            {mine ? (
              <div style={{ fontSize: 12, color: "var(--fa-muted)", marginTop: 6 }}>En attente de l&rsquo;autre parent.</div>
            ) : adjusting === item.id ? (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  style={fieldStyle}
                  aria-label={`Nouveau montant (${item.label})`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(e.target.value)}
                />
                <PillButton variant="primary" onClick={() => decide(item, "ajustee", toMinorUnits(Number(adjustedAmount)))}>Confirmer</PillButton>
                <PillButton variant="ghost" onClick={() => setAdjusting(null)}>Annuler</PillButton>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <PillButton variant="primary" aria-label={`Valider ${item.label}`} onClick={() => decide(item, "validee")}>Valider</PillButton>
                <PillButton
                  aria-label={`Ajuster ${item.label}`}
                  onClick={() => {
                    setAdjusting(item.id);
                    setAdjustedAmount(String(item.amount / 100));
                  }}
                >
                  Ajuster
                </PillButton>
                <PillButton variant="ghost" aria-label={`Refuser ${item.label}`} onClick={() => decide(item, "refusee")}>Refuser</PillButton>
              </div>
            )}
          </div>
        );
      })}
      {error && <div style={{ fontSize: 12.5, color: "var(--fa-alert)", marginTop: 6 }}>{error}</div>}
    </div>
  );
}
