create table family_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  category text not null default 'autres' check (category in ('sante', 'ecole', 'urgences', 'autres')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contact_children_link (
  contact_id uuid not null references family_contacts(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  primary key (contact_id, member_id)
);

-- Task categories (see 0005_tasks.sql) referenced here for suggestion chaining.
create table contact_category_suggestions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  after_task_category_id uuid,
  suggested_contact_category text not null check (suggested_contact_category in ('sante', 'ecole', 'urgences', 'autres')),
  created_at timestamptz not null default now()
);

alter table family_contacts enable row level security;
alter table contact_children_link enable row level security;
alter table contact_category_suggestions enable row level security;

create policy "members can access their family's contacts" on family_contacts
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access contact children links" on contact_children_link
  for all using (
    exists (select 1 from family_contacts c where c.id = contact_children_link.contact_id and is_family_member(c.family_id))
  )
  with check (
    exists (select 1 from family_contacts c where c.id = contact_children_link.contact_id and is_family_member(c.family_id))
  );

create policy "members can access contact category suggestions" on contact_category_suggestions
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
