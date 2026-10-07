import { formatMoney } from "@/shared/lib/money";

// Montant affichable ou masqué (œil de l'écran Budget).
export function Amount({ value, currency, hidden }: { value: number; currency: string; hidden: boolean }) {
  return <span>{hidden ? "•••" : formatMoney(value, currency)}</span>;
}
