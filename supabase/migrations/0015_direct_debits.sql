-- Tranche 4 (budget) : prélèvements automatiques et montant réel par période.
-- Une charge peut être un prélèvement (validé automatiquement une fois la date
-- passée) ou « à faire » (cochée à la main). Le jour de prélèvement est dans
-- le cycle budgétaire (de 1 à 28, comme le jour de reset).
alter table budget_lines
  add column is_direct_debit boolean not null default false,
  add column debit_day smallint check (debit_day between 1 and 28);

-- Montant réellement payé sur la période (charges au montant variable : électricité, eau…).
alter table budget_line_cycles
  add column amount integer;

-- `period_month` est le premier jour de la période budgétaire, qui commence au
-- jour de reset choisi par la famille (pas forcément le 1er du mois).
comment on column budget_line_cycles.period_month is 'Premier jour de la période budgétaire (jour de reset choisi).';
