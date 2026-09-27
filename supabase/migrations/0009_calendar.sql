-- Calendar events themselves are tasks with due_date/due_time set (see 0005_tasks.sql) —
-- no separate event object. This table only holds external sync configuration.
create table calendar_sync_settings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  provider text not null check (provider in ('google', 'outlook', 'apple')),
  sync_enabled boolean not null default false,
  external_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, provider)
);

alter table calendar_sync_settings enable row level security;

create policy "members can access calendar sync settings" on calendar_sync_settings
  for all using (
    exists (select 1 from family_members m where m.id = calendar_sync_settings.member_id and is_family_member(m.family_id))
  )
  with check (
    exists (select 1 from family_members m where m.id = calendar_sync_settings.member_id and is_family_member(m.family_id))
  );
