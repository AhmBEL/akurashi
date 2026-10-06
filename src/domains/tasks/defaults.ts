// Catégories de tâches proposées à l'onboarding (brief §4, question 16).
// Valeurs de départ : les parents les modifient ensuite.
export const DEFAULT_TASK_CATEGORIES: Array<{ name: string; needsContactPlace: boolean }> = [
  { name: "Santé", needsContactPlace: true },
  { name: "École", needsContactPlace: true },
  { name: "Administratif", needsContactPlace: true },
  { name: "Perso/social", needsContactPlace: false },
  { name: "Maison/voiture", needsContactPlace: false },
  { name: "Activités enfant", needsContactPlace: true },
];
