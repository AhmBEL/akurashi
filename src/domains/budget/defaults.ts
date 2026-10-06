// Catégories proposées à la création d'une famille. Ce ne sont que des
// valeurs de départ, modifiables ensuite par les parents (jamais en dur
// dans la logique). Courses et Loisirs alimentent les jauges de l'accueil ;
// sans plafond saisi (brief §4, question 14), la jauge reste à 0 %.
export const DEFAULT_BUDGET_CATEGORIES: Array<{ name: string; showOnHome: boolean }> = [
  { name: "Courses", showOnHome: true },
  { name: "Loisirs", showOnHome: true },
  { name: "Logement", showOnHome: false },
  { name: "Assurances", showOnHome: false },
  { name: "Santé", showOnHome: false },
];
