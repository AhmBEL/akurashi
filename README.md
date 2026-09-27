# Akurashi

Application familiale privée (PWA). Voir les fichiers `.md` de référence fonctionnelle/technique fournis séparément — ce README ne couvre que la mise en route.

## Prérequis

- Node.js 20+
- Un projet [Supabase](https://supabase.com) (gratuit) — cloud, pas besoin de Docker/Postgres local pour développer
- Le CLI Supabase, installé en dépendance de dev du projet (`npx supabase`, déjà dans `package.json`)

Docker + le CLI en local restent une option (voir "Alternative : tout en local" plus bas) si tu veux un jour une base jetable, isolée de la vraie donnée — pas nécessaire pour un usage privé.

## Mise en route (projet Supabase cloud)

```bash
npm install

# Lie le CLI à ton projet Supabase (récupère le ref dans l'URL du projet :
# https://supabase.com/dashboard/project/<ref>)
SUPABASE_ACCESS_TOKEN=<ton jeton, voir dashboard/account/tokens> npx supabase link --project-ref <ref>

# Pousse le schéma puis le seed de démo vers ce projet
SUPABASE_ACCESS_TOKEN=<ton jeton> npx supabase db push
SUPABASE_ACCESS_TOKEN=<ton jeton> npx supabase db push --include-seed

cp .env.local.example .env.local
# Remplis avec l'URL du projet et la clé "anon" (Réglages → API du dashboard) —
# JAMAIS la clé "service_role", qui contourne toute la sécurité (RLS).

npm run dev
```

Ouvre <http://localhost:3000>, connecte-toi via le lien magique — un vrai email est envoyé à l'adresse
saisie (pas d'email de test ici, contrairement à un Supabase local avec Inbucket).

Le seed crée une famille de démonstration avec 2 parents + 1 enfant, mais aucun de ces membres n'est
encore lié à un compte Supabase Auth réel. Après ta première connexion par lien magique, relie ton compte
via le SQL Editor du dashboard Supabase :

```sql
update family_members
set linked_account_id = (select id from auth.users where email = 'ton@email.com')
where id = '00000000-0000-0000-0000-000000000011';
```

## Alternative : tout en local (Docker)

Si tu préfères un Postgres jetable en local plutôt que le projet cloud :

```bash
# Nécessite Docker Desktop (+ WSL2 activé sur Windows)
npx supabase start
npx supabase db reset   # applique migrations + seed
```

Les identifiants (URL, clé anon) s'affichent dans la sortie de `supabase start`, et les emails de
connexion sont interceptés par Inbucket (<http://localhost:54324>) plutôt qu'envoyés pour de vrai.

## Structure

- `src/app` — routes Next.js (App Router)
- `src/domains` — logique métier par domaine (repository = seul point d'accès Supabase de ce domaine)
- `src/shared` — UI partagée, tokens de design, client Supabase
- `supabase/migrations` — schéma SQL versionné
- `supabase/seed.sql` — données de démonstration uniquement

## État de cette itération

Écran Accueil parent complet et testé de bout en bout avec un vrai projet Supabase (tâches cochables,
résumé budget avec ajout de dépense fonctionnel, carte documents, accès rapides). Les autres écrans
(`agenda`, `documents`, `sujets`, `enfants`, `reglages`, `budget`) sont des pages de contenu factice, à
construire dans une prochaine itération.
