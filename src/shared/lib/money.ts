// Amounts are always stored as integers in the currency's minor unit (cents).
// Currency and locale come from the family's own settings — never hardcoded.
export function formatMoney(amountMinorUnits: number, currencyCode: string, locale = "fr-FR"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amountMinorUnits / 100);
  } catch {
    return `${(amountMinorUnits / 100).toFixed(0)} ${currencyCode}`;
  }
}

export function toMinorUnits(amountMajorUnits: number): number {
  return Math.round(amountMajorUnits * 100);
}
