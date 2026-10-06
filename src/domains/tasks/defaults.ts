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

// Modèles de tâches par domaine (MASTER_Code_Options §5) : un clic remplit le titre.
export const TASK_TEMPLATES: Record<string, string[]> = {
  "Santé": ["Médecin", "Dentiste", "Ophtalmo", "Vaccin", "Pédiatre", "Kiné / ostéo", "Renouvellement ordonnance"],
  "École": ["RDV enseignant", "Réunion parents-profs", "Sortie scolaire", "Inscription cantine / périscolaire", "Fournitures"],
  "Administratif": ["CNI / passeport", "Dossier CAF", "Impôts", "Carte grise", "Mutuelle à renouveler"],
  "Perso/social": ["Verre entre amis", "Resto", "Anniversaire d'un proche", "Appel famille"],
  "Maison/voiture": ["Contrôle technique", "Vidange", "Entretien chaudière", "Détecteur de fumée", "Jardin"],
  "Activités enfant": ["Inscription activité", "Cours récurrent", "Compétition / spectacle", "Licence sportive"],
};

export const WEEKDAY_LABELS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."] as const;
