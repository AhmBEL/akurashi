create table pocket_money_pots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references family_members(id) on delete cascade,
  reset_mode text not null default 'cumul' check (reset_mode in ('mensuel', 'cumul')),
  max_amount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pocket_money_transactions (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references pocket_money_pots(id) on delete cascade,
  amount integer not null, -- minor currency units, signed (credit/debit)
  description text,
  created_by uuid references family_members(id),
  created_at timestamptz not null default now()
);

alter table pocket_money_pots enable row level security;
alter table pocket_money_transactions enable row level security;

create policy "members can access their family's pocket money pots" on pocket_money_pots
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can access pocket money transactions" on pocket_money_transactions
  for all using (
    exists (select 1 from pocket_money_pots p where p.id = pocket_money_transactions.pot_id and is_family_member(p.family_id))
  )
  with check (
    exists (select 1 from pocket_money_pots p where p.id = pocket_money_transactions.pot_id and is_family_member(p.family_id))
  );
