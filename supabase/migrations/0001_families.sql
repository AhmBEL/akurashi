-- Extensions
create extension if not exists "pgcrypto";

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'EUR',
  -- Freemium/premium: dormant fields, no logic reads these yet.
  subscription_tier text,
  subscription_status text,
  -- Placeholder for future recomposed-family support; no logic behind it yet.
  linked_family_ref_id uuid references families(id),
  onboarding_pain_points text[] not null default '{}',
  -- App-wide protection level: libre | accueil_protege | tout_protege.
  security_level text not null default 'libre'
    check (security_level in ('libre', 'accueil_protege', 'tout_protege')),
  documents_lock_enabled boolean not null default true,
  emergency_contacts_unlocked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  role text not null check (role in ('parent', 'enfant')),
  -- Children only: managed ("Accompagné") | invited_pending | linked ("Autonome").
  access_status text check (access_status in ('managed', 'invited_pending', 'linked')),
  linked_account_id uuid references auth.users(id),
  age integer,
  signature_color text not null default 'sauge',
  dark_mode_enabled boolean not null default false,
  rdv_prive_autorise boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  tier text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table plan_limits (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique,
  max_children integer,
  max_active_sujets integer,
  history_months integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper used by every RLS policy from here on: true when the current
-- authenticated user is an active (non soft-deleted) member of the given
-- family. Defined after family_members: `language sql` functions are parsed
-- and validated at CREATE time, so the referenced table must already exist.
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from family_members fm
    where fm.family_id = target_family_id
      and fm.linked_account_id = auth.uid()
      and fm.deleted_at is null
  );
$$;

alter table families enable row level security;
alter table family_members enable row level security;
alter table subscriptions enable row level security;
alter table plan_limits enable row level security;

create policy "members can access their family" on families
  for all using (is_family_member(id)) with check (is_family_member(id));

create policy "members can access their family roster" on family_members
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access their subscription" on subscriptions
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "anyone authenticated can read plan limits" on plan_limits
  for select using (auth.uid() is not null);
