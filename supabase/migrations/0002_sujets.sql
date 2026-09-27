create table sujets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  template text check (template in ('anniversaire', 'vacances', 'achat_important', 'rentree_scolaire', 'autre')),
  closure_mode text not null default 'manuel' check (closure_mode in ('auto_after_date', 'manuel')),
  status text not null default 'ouvert' check (status in ('ouvert', 'archive')),
  event_date date,
  created_by uuid references family_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sujet_participants (
  sujet_id uuid not null references sujets(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  primary key (sujet_id, member_id)
);

alter table sujets enable row level security;
alter table sujet_participants enable row level security;

create policy "members can access their family's sujets" on sujets
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access sujet participants" on sujet_participants
  for all using (
    exists (select 1 from sujets s where s.id = sujet_participants.sujet_id and is_family_member(s.family_id))
  )
  with check (
    exists (select 1 from sujets s where s.id = sujet_participants.sujet_id and is_family_member(s.family_id))
  );
