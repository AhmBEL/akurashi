// Valeurs de départ appliquées quand une question de l'onboarding est sautée
// (brief §4). Toutes modifiables ensuite dans Réglages.
export const DEFAULT_CURRENCY = "MUR";
export const DEFAULT_FAMILY_NAME = "Ma famille";
export const DEFAULT_PARENT_NAME = "Parent 1";
export const DEFAULT_SECURITY_LEVEL = "libre" as const;

export const CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "MUR", label: "Roupie mauricienne (Rs)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "Dollar US ($)" },
  { code: "GBP", label: "Livre sterling (£)" },
  { code: "CHF", label: "Franc suisse (CHF)" },
];

export const SECURITY_LEVEL_OPTIONS = [
  { value: "libre", label: "Libre", hint: "Aucune protection à l'ouverture." },
  { value: "accueil_protege", label: "Accueil libre, reste protégé", hint: "L'accueil est visible sans déverrouiller ; les montants y sont masqués par défaut." },
  { value: "tout_protege", label: "Tout protégé", hint: "Code ou Face ID dès l'ouverture (verrou réel en phase finale)." },
] as const;
