create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  -- Not in the original schema doc: needed to compute the home screen's grouped
  -- progress gauges (e.g. Courses/Loisirs). Null means "no gauge for this category".
  monthly_target_amount integer,
  show_on_home boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table budget_lines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  category_id uuid not null references budget_categories(id),
  -- Derived from the entry form (periodicity + is amount fixed?), not chosen directly.
  financial_type text not null
    check (financial_type in ('fixe_fixe', 'fixe_variable', 'variable_prevue', 'variable_imprevue')),
  amount integer not null, -- minor currency units (cents)
  periodicity text check (periodicity in ('mensuel', 'trimestriel', 'annuel')),
  -- Not in the original schema doc: the quick-add expense screen asks for a date,
  -- which may differ from created_at (logging yesterday's coffee).
  spent_on date not null default current_date,
  responsible_id uuid references family_members(id),
  visibility text not null default 'family' check (visibility in ('private', 'family')),
  validation_status text not null default 'validee'
    check (validation_status in ('proposee', 'validee', 'ajustee', 'refusee')),
  proposed_by uuid references family_members(id),
  task_id uuid references tasks(id),
  receipt_photo_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Monthly paid/unpaid tracking for a recurring fixed charge.
create table budget_line_cycles (
  id uuid primary key default gen_random_uuid(),
  budget_line_id uuid not null references budget_lines(id) on delete cascade,
  period_month date not null, -- always the 1st of the month
  status text not null default 'non_paye' check (status in ('paye', 'non_paye')),
  paid_at timestamptz,
  unique (budget_line_id, period_month)
);

alter table budget_categories enable row level security;
alter table budget_lines enable row level security;
alter table budget_line_cycles enable row level security;

create policy "members can access their family's budget categories" on budget_categories
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access their family's budget lines" on budget_lines
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access budget line cycles" on budget_line_cycles
  for all using (
    exists (select 1 from budget_lines b where b.id = budget_line_cycles.budget_line_id and is_family_member(b.family_id))
  )
  with check (
    exists (select 1 from budget_lines b where b.id = budget_line_cycles.budget_line_id and is_family_member(b.family_id))
  );
