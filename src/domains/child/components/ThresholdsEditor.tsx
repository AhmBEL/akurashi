"use client";

import { getStore } from "@/shared/data/getStore";
import { BlurInput } from "@/shared/ui/BlurInput";
import { PillButton } from "@/shared/ui/PillButton";
import { toMinorUnits } from "@/shared/lib/money";
import { useChildReward } from "../hooks";
import { resetThresholds, updateThreshold } from "../repository";

const labelStyle = { fontSize: 11.5, color: "var(--fa-muted)", margin: "10px 0 6px" } as const;

// Paliers hebdomadaires d'un enfant, modifiables (réservé aux parents, dans Réglages).
// Le premier palier reste à 0 : l'enfant n'a jamais les mains vides.
export function ThresholdsEditor({ childId, currency }: { childId: string; currency: string }) {
  const reward = useChildReward(childId);
  if (!reward || reward.thresholds.length === 0) return null;

  const financial = reward.config.compensationType === "financiere_libre" || reward.config.compensationType === "financiere_indexee";
  const store = getStore();

  return (
    <div>
      <div style={labelStyle}>Paliers de la semaine (tâches validées)</div>
      {reward.thresholds.map((threshold, index) => (
        <div key={threshold.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 2 }}>
            <BlurInput
              label={`Nom du palier ${index + 1}`}
              value={threshold.label}
              onCommit={(label) => label.trim() && updateThreshold(store, threshold.id, { label: label.trim() })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <BlurInput
              label={`Seuil du palier ${threshold.label}`}
              type="number"
              disabled={index === 0}
              value={String(threshold.thresholdValue)}
              onCommit={(value) => updateThreshold(store, threshold.id, { thresholdValue: Number(value) })}
            />
          </div>
          {financial && (
            <div style={{ flex: 1 }}>
              <BlurInput
                label={`Montant du palier ${threshold.label} (${currency})`}
                type="number"
                value={threshold.amount ? String(threshold.amount / 100) : ""}
                onCommit={(value) =>
                  updateThreshold(store, threshold.id, { amount: Number(value) > 0 ? toMinorUnits(Number(value)) : null })
                }
              />
            </div>
          )}
        </div>
      ))}
      <PillButton variant="ghost" onClick={() => void resetThresholds(store, reward.rewardSystemId, reward.config.type)}>
        Rétablir les paliers par défaut
      </PillButton>
    </div>
  );
}
