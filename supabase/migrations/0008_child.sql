create table reward_systems (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references family_members(id) on delete cascade,
  type text not null default 'badge' check (type in ('badge', 'etoile', 'note', 'compteur', 'aucun')),
  compensation_type text not null default 'aucune'
    check (compensation_type in ('financiere_indexee', 'financiere_libre', 'aucune')),
  unlock_mode text not null default 'progressif' check (unlock_mode in ('progressif', 'final')),
  visual_theme text check (visual_theme in ('ferme', 'foret', 'ocean')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id)
);

create table reward_thresholds (
  id uuid primary key default gen_random_uuid(),
  reward_system_id uuid not null references reward_systems(id) on delete cascade,
  label text not null,
  threshold_value integer not null,
  amount integer,
  sort_order integer not null default 0
);

create table demandes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references family_members(id),
  type text not null check (type in ('besoin', 'autorisation')),
  target_parent_id uuid references family_members(id),
  related_task_id uuid references tasks(id),
  related_document_id uuid references documents(id),
  status text not null default 'en_attente',
  generated_task_id uuid references tasks(id),
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demandes_exactly_one_related check (
    (related_task_id is not null and related_document_id is null)
    or (related_task_id is null and related_document_id is not null)
    or (related_task_id is null and related_document_id is null)
  )
);

create table emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references family_members(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table reward_systems enable row level security;
alter table reward_thresholds enable row level security;
alter table demandes enable row level security;
alter table emergency_alerts enable row level security;

create policy "members can access reward systems" on reward_systems
  for all using (
    exists (select 1 from family_members m where m.id = reward_systems.child_id and is_family_member(m.family_id))
  )
  with check (
    exists (select 1 from family_members m where m.id = reward_systems.child_id and is_family_member(m.family_id))
  );

create policy "members can access reward thresholds" on reward_thresholds
  for all using (
    exists (
      select 1 from reward_systems r
      join family_members m on m.id = r.child_id
      where r.id = reward_thresholds.reward_system_id and is_family_member(m.family_id)
    )
  )
  with check (
    exists (
      select 1 from reward_systems r
      join family_members m on m.id = r.child_id
      where r.id = reward_thresholds.reward_system_id and is_family_member(m.family_id)
    )
  );

create policy "members can access their family's demandes" on demandes
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access emergency alerts" on emergency_alerts
  for all using (
    exists (select 1 from family_members m where m.id = emergency_alerts.child_id and is_family_member(m.family_id))
  )
  with check (
    exists (select 1 from family_members m where m.id = emergency_alerts.child_id and is_family_member(m.family_id))
  );
