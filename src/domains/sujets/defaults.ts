import type { SujetTemplateKey } from "./types";

// Modèles proposés à l'ouverture d'un Sujet (04-ecrans §6) : titre suggéré +
// tâches suggérées, toutes modifiables ou supprimables avant la création.
// Listes de départ — la liste précise reste à valider avec la famille.
export interface SujetTemplate {
  key: SujetTemplateKey;
  label: string;
  titleHint: string;
  tasks: string[];
}

export const SUJET_TEMPLATES: SujetTemplate[] = [
  {
    key: "anniversaire",
    label: "Anniversaire",
    titleHint: "Anniversaire de …",
    tasks: [
      "Choisir la date et le lieu",
      "Faire la liste des invités",
      "Envoyer les invitations",
      "Préparer le gâteau",
      "Choisir le cadeau",
      "Prévoir la déco et les jeux",
    ],
  },
  {
    key: "vacances",
    label: "Vacances",
    titleHint: "Vacances de …",
    tasks: [
      "Choisir les dates",
      "Réserver le logement",
      "Réserver les transports",
      "Vérifier les papiers d'identité",
      "Préparer les valises",
      "Organiser la maison pendant l'absence",
    ],
  },
  {
    key: "achat_important",
    label: "Achat important",
    titleHint: "Achat : …",
    tasks: [
      "Définir le besoin et le budget",
      "Comparer les offres",
      "Lire les avis",
      "Décider ensemble",
      "Passer la commande",
      "Vérifier la garantie",
    ],
  },
  {
    key: "rentree_scolaire",
    label: "Rentrée scolaire",
    titleHint: "Rentrée de …",
    tasks: [
      "Vérifier les inscriptions",
      "Acheter les fournitures",
      "Préparer vêtements et cartable",
      "Organiser trajets et garde",
      "Remplir les papiers de l'école",
    ],
  },
  { key: "autre", label: "Autre", titleHint: "Titre du Sujet", tasks: [] },
];

export const templateLabel = (key: SujetTemplateKey | null): string | null =>
  SUJET_TEMPLATES.find((template) => template.key === key)?.label ?? null;
