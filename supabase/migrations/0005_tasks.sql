-- Configurable per family, never hardcoded (Santé, École, Administratif, Perso/social, Maison/voiture, Activités enfant...).
create table task_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  necessite_contact_lieu boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  due_time time,
  -- Pattern subject/actor (see 02-architecture-technique.md §2.7): who the task belongs
  -- to vs. who actually performed the action. Lets a parent act for a managed child
  -- without duplicating logic between managed and autonomous children.
  subject_id uuid references family_members(id),
  actor_id uuid references family_members(id),
  location_contact_id uuid references family_contacts(id),
  location_text text,
  assignment_status text not null default 'a_decider'
    check (assignment_status in ('auto_assignee', 'assignee', 'partagee', 'a_discuter', 'a_decider')),
  recurrence_type text not null default 'none' check (recurrence_type in ('none', 'weekly_pattern')),
  recurrence_days smallint[] not null default '{}',
  visibility text not null default 'family' check (visibility in ('private', 'family')),
  is_urgent boolean not null default false,
  sujet_id uuid references sujets(id),
  -- Not in the original schema doc: required by the task-list checkboxes (04-ecrans-a-construire.md).
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_participants (
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  role_in_task text not null default 'assigne' check (role_in_task in ('auto', 'assigne', 'partage')),
  primary key (task_id, member_id)
);

create table task_categories_link (
  task_id uuid not null references tasks(id) on delete cascade,
  category_id uuid not null references task_categories(id) on delete cascade,
  primary key (task_id, category_id)
);

-- Documents attached to a task from the vault, either just for this task or
-- permanently attached to the related contact (e.g. a passport tied to a child's contact card).
create table task_documents (
  task_id uuid not null references tasks(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  scope text not null default 'this_task' check (scope in ('this_task', 'permanent_contact')),
  primary key (task_id, document_id)
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  sujet_id uuid references sujets(id) on delete cascade,
  author_id uuid not null references family_members(id),
  content text not null,
  created_at timestamptz not null default now(),
  constraint task_comments_exactly_one_parent check (
    (task_id is not null and sujet_id is null) or (task_id is null and sujet_id is not null)
  )
);

-- Tracks whether an autonomous child has viewed their weekly summary.
create table bilan_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  period_start date not null,
  acknowledged_at timestamptz not null default now(),
  unique (member_id, period_start)
);

alter table task_categories enable row level security;
alter table tasks enable row level security;
alter table task_participants enable row level security;
alter table task_categories_link enable row level security;
alter table task_documents enable row level security;
alter table task_comments enable row level security;
alter table bilan_acknowledgments enable row level security;

create policy "members can access their family's task categories" on task_categories
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access their family's tasks" on tasks
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access task participants" on task_participants
  for all using (
    exists (select 1 from tasks t where t.id = task_participants.task_id and is_family_member(t.family_id))
  )
  with check (
    exists (select 1 from tasks t where t.id = task_participants.task_id and is_family_member(t.family_id))
  );

create policy "members can access task category links" on task_categories_link
  for all using (
    exists (select 1 from tasks t where t.id = task_categories_link.task_id and is_family_member(t.family_id))
  )
  with check (
    exists (select 1 from tasks t where t.id = task_categories_link.task_id and is_family_member(t.family_id))
  );

create policy "members can access task documents links" on task_documents
  for all using (
    exists (select 1 from tasks t where t.id = task_documents.task_id and is_family_member(t.family_id))
  )
  with check (
    exists (select 1 from tasks t where t.id = task_documents.task_id and is_family_member(t.family_id))
  );

create policy "members can access task comments" on task_comments
  for all using (
    (task_id is not null and exists (select 1 from tasks t where t.id = task_comments.task_id and is_family_member(t.family_id)))
    or
    (sujet_id is not null and exists (select 1 from sujets s where s.id = task_comments.sujet_id and is_family_member(s.family_id)))
  )
  with check (
    (task_id is not null and exists (select 1 from tasks t where t.id = task_comments.task_id and is_family_member(t.family_id)))
    or
    (sujet_id is not null and exists (select 1 from sujets s where s.id = task_comments.sujet_id and is_family_member(s.family_id)))
  );

create policy "members can access bilan acknowledgments" on bilan_acknowledgments
  for all using (
    exists (select 1 from family_members m where m.id = bilan_acknowledgments.member_id and is_family_member(m.family_id))
  )
  with check (
    exists (select 1 from family_members m where m.id = bilan_acknowledgments.member_id and is_family_member(m.family_id))
  );
