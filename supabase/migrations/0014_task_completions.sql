-- Tranche 3 (motivation enfant) : journal des validations de tâches.
-- Pattern subject/actor : `subject_id` = l'enfant concerné, `actor_id` = qui a
-- coché (l'enfant, ou un parent pour lui). Sert au compte hebdomadaire des
-- paliers et à l'annulation de la dernière action (un seul niveau).
create table task_completions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  subject_id uuid not null references family_members(id) on delete cascade,
  actor_id uuid references family_members(id),
  completed_on date not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index task_completions_subject_idx on task_completions (subject_id, completed_on);

alter table task_completions enable row level security;

create policy "members can access their family's task completions" on task_completions
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
