"use client";

import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/money";
import { useChildProgress } from "../hooks";
import { motivationMessage } from "../services/motivationMessage";
import styles from "./ProgressCard.module.css";

interface ProgressCardProps {
  childId: string;
  // Réservé aux parents : l'enfant ne voit jamais l'argent.
  currencyForAmount?: string;
}

// Carte de palier : palier courant, barre vers le suivant, phrase tutoyée.
// Rien n'est affiché si l'enfant n'a pas de système de récompense.
export function ProgressCard({ childId, currencyForAmount }: ProgressCardProps) {
  const data = useChildProgress(childId);
  if (!data?.reward || data.reward.config.type === "aucun") return null;

  const { reward, weekCount, progress } = data;
  const type = reward.config.type;
  const financial = reward.config.compensationType === "financiere_libre" || reward.config.compensationType === "financiere_indexee";
  const amount = currencyForAmount && financial ? progress?.current?.amount : null;

  const message = progress
    ? motivationMessage(type, progress)
    : motivationMessage(type, { count: weekCount, current: null, next: null, remainingToNext: 0, pctToNext: 0, isTop: false });

  return (
    <Card variant="accent" radius="44px 18px 48px 24px" className={styles.card}>
      <div className={styles.blob} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.kicker}>Cette semaine · {weekCount} tâche{weekCount > 1 ? "s" : ""}</div>
        <div className={styles.tier}>{progress ? (progress.current?.label ?? "—") : `${weekCount} tâche${weekCount > 1 ? "s" : ""}`}</div>
        {progress && (
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${progress.pctToNext}%` }} />
          </div>
        )}
        <div className={styles.message}>{message}</div>
        {amount ? <div className={styles.amount}>Palier actuel : {formatMoney(amount, currencyForAmount!)}</div> : null}
      </div>
    </Card>
  );
}
