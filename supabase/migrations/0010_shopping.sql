create table shopping_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  store_name text not null,
  opened_by uuid references family_members(id),
  countdown_end_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- One persistent, always-open list per family; items can be added any time,
-- with or without an active shopping session.
create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  session_id uuid references shopping_sessions(id),
  label text not null,
  quantity integer not null default 1,
  added_by uuid references family_members(id),
  checked boolean not null default false,
  checked_by uuid references family_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table shopping_sessions enable row level security;
alter table shopping_list_items enable row level security;

create policy "members can access their family's shopping sessions" on shopping_sessions
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access their family's shopping list items" on shopping_list_items
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
