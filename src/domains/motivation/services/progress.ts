export interface TierLike {
  thresholdValue: number;
}

export interface TierProgress<T extends TierLike> {
  count: number;
  current: T | null;
  next: T | null;
  remainingToNext: number;
  pctToNext: number; // 0-100 entre le palier courant et le suivant ; 100 au sommet
  isTop: boolean;
}

// Palier courant = le plus haut dont le seuil est atteint. Le premier palier est
// à 0 (réglage verrouillé) : l'enfant a toujours un palier, jamais les mains vides.
export function computeProgress<T extends TierLike>(thresholds: T[], count: number): TierProgress<T> {
  const sorted = [...thresholds].sort((a, b) => a.thresholdValue - b.thresholdValue);
  const reached = sorted.filter((tier) => tier.thresholdValue <= count);
  const current = reached.length > 0 ? reached[reached.length - 1] : null;
  const next = sorted.find((tier) => tier.thresholdValue > count) ?? null;

  if (!next) {
    return { count, current, next: null, remainingToNext: 0, pctToNext: 100, isTop: sorted.length > 0 };
  }

  const floor = current?.thresholdValue ?? 0;
  const span = next.thresholdValue - floor;
  const pctToNext = span > 0 ? Math.min(100, Math.max(0, Math.round(((count - floor) / span) * 100))) : 0;
  return { count, current, next, remainingToNext: next.thresholdValue - count, pctToNext, isTop: false };
}
