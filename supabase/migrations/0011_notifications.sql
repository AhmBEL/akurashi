create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  category text not null,
  enabled boolean not null default true,
  unique (member_id, category)
);

-- Pure log table: no created_at/updated_at pair, just when it was sent and read.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  recipient_id uuid not null references family_members(id),
  category text not null,
  title text not null,
  body text,
  is_urgent boolean not null default false,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

alter table notification_settings enable row level security;
alter table notifications enable row level security;

create policy "members can access notification settings" on notification_settings
  for all using (
    exists (select 1 from family_members m where m.id = notification_settings.member_id and is_family_member(m.family_id))
  )
  with check (
    exists (select 1 from family_members m where m.id = notification_settings.member_id and is_family_member(m.family_id))
  );

create policy "members can access their family's notifications" on notifications
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
