-- Tranche 1 (onboarding) : réglages structurés de la famille, plafonds de
-- budget avec période, et valeur « crédit bon comportement » du brief.

alter table families
  add column settings jsonb not null default '{}'::jsonb;

alter table budget_categories rename column monthly_target_amount to target_amount;
alter table budget_categories
  add column target_period text not null default 'month' check (target_period in ('week', 'month'));

alter table reward_systems drop constraint reward_systems_compensation_type_check;
alter table reward_systems
  add constraint reward_systems_compensation_type_check
  check (compensation_type in ('financiere_indexee', 'financiere_libre', 'credit_comportement', 'aucune'));
