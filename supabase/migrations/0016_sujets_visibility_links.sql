-- Tranche 5 (Sujets) : visibilité par Sujet et liens.
-- Visibilité demandée par le brief : privé (un seul membre), entre parents, ou
-- toute la famille. Les participants (`sujet_participants`) restent la liste de
-- ceux qui voient le Sujet ; la visibilité borne qui peut être participant.
alter table sujets
  add column visibility text not null default 'famille'
    check (visibility in ('prive', 'parents', 'famille'));

-- Liens joints à un Sujet (les fichiers attendent le coffre-fort, tranche 7).
create table sujet_links (
  id uuid primary key default gen_random_uuid(),
  sujet_id uuid not null references sujets(id) on delete cascade,
  label text not null,
  url text not null check (url ~* '^https?://'),
  added_by uuid references family_members(id),
  created_at timestamptz not null default now()
);

alter table sujet_links enable row level security;

create policy "members can access sujet links" on sujet_links
  for all using (
    exists (select 1 from sujets s where s.id = sujet_links.sujet_id and is_family_member(s.family_id))
  )
  with check (
    exists (select 1 from sujets s where s.id = sujet_links.sujet_id and is_family_member(s.family_id))
  );
