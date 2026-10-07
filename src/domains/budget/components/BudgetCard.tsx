"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { formatMoney } from "@/shared/lib/money";
import type { HomeBudgetSummary } from "../types";
import styles from "./BudgetCard.module.css";

interface BudgetCardProps {
  summary: HomeBudgetSummary;
  currency: string;
  defaultAmountsHidden: boolean;
}

const STATUS_LABEL: Record<NonNullable<HomeBudgetSummary["fixedChargesStatus"]>, string> = {
  rouge: "Aucune charge fixe traitée ce mois-ci",
  orange: "Au moins une charge fixe traitée",
};

export function BudgetCard({ summary, currency, defaultAmountsHidden }: BudgetCardProps) {
  const [hidden, setHidden] = useState(defaultAmountsHidden);
  const dotColor = summary.fixedChargesStatus === "orange" ? "var(--fa-warn)" : "var(--fa-alert)";

  return (
    <Card variant="accent" radius="44px 18px 52px 26px" rotate="-.5deg" className={styles.card}>
      <div className={styles.blob} aria-hidden="true" />
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Budget</div>
          {summary.fixedChargesStatus && (
            <div className={styles.statusRow}>
              <span className={styles.dot} style={{ background: dotColor }} />
              <span className={styles.statusLabel}>{STATUS_LABEL[summary.fixedChargesStatus]}</span>
            </div>
          )}
        </div>
        <button
          className={styles.eyeButton}
          onClick={() => setHidden((h) => !h)}
          title={hidden ? "Afficher les montants" : "Masquer les montants"}
          aria-label={hidden ? "Afficher les montants" : "Masquer les montants"}
        >
          {hidden ? <EyeOff size={19} strokeWidth={2.4} /> : <Eye size={19} strokeWidth={2.4} />}
        </button>
      </div>

      {summary.gauges.length > 0 && (
        <div className={styles.gauges}>
          {summary.gauges.map((gauge) => (
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
              fillColor="rgba(255,255,255,.92)"
              onAccent
            />
          ))}
        </div>
      )}

      <Link href="/budget" className={styles.detailLink}>
        Voir le détail
      </Link>
    </Card>
  );
}
