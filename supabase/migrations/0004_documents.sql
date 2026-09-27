-- Configurable list of document categories per family (defaults seeded, never hardcoded in app code).
create table document_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  category_id uuid references document_categories(id),
  member_id uuid references family_members(id),
  access_status text not null default 'restreint' check (access_status in ('libre', 'restreint')),
  tags text[] not null default '{}',
  file_url text not null,
  name text not null,
  expires_on date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Family-level tag registry, used for autocomplete/reuse when tagging a document.
create table document_tags (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (family_id, tag)
);

alter table document_categories enable row level security;
alter table documents enable row level security;
alter table document_tags enable row level security;

create policy "members can access their family's document categories" on document_categories
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access their family's documents" on documents
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access their family's document tags" on document_tags
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
