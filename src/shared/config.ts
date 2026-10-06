// DEMO_MODE (brief de démarrage §3) : un seul code, deux modes.
// Activé : aucun login, données locales persistantes (IndexedDB), réglages
// développeur visibles. Désactivé : Supabase (Auth, RLS) — version finale.
// Se pilote avec la variable d'environnement NEXT_PUBLIC_DEMO_MODE.
// À COUPER avant toute vraie donnée de famille : en démo, il n'y a ni
// connexion ni contrôle d'accès.
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
