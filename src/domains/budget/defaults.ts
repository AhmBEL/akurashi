// Jauges de l'accueil, créées avec le budget (brief §4, question 14) :
// courses au rythme de la semaine, loisirs au rythme du mois. Sans plafond
// saisi, la jauge reste à 0 %. Valeurs de départ, modifiables ensuite.
export const DEFAULT_BUDGET_CATEGORIES = [
  { key: "courses", name: "Courses", targetPeriod: "week" },
  { key: "loisirs", name: "Loisirs", targetPeriod: "month" },
] as const satisfies ReadonlyArray<{ key: string; name: string; targetPeriod: "week" | "month" }>;

export type DefaultBudgetCategoryKey = (typeof DEFAULT_BUDGET_CATEGORIES)[number]["key"];

// Charges fixes proposées à cocher (brief §4, question 13).
export const FIXED_CHARGE_OPTIONS = [
  "Loyer / crédit",
  "Assurances",
  "Mutuelle",
  "Mobile",
  "Internet",
  "Streaming",
  "Activités enfant",
  "Électricité",
  "Eau",
] as const;

// Charges fixes en temps mais au montant variable (catégorie 2 du brief) ;
// toutes les autres sont à montant fixe (catégorie 1).
export const VARIABLE_AMOUNT_CHARGES: readonly string[] = ["Électricité", "Eau"];
