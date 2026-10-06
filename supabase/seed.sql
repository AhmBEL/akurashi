-- Demo family for local development only. These are data rows, never hardcoded
-- values in application code — the app itself never assumes a name, age or gender.
insert into families (id, name, currency, security_level)
values ('00000000-0000-0000-0000-000000000001', 'Famille de démonstration', 'EUR', 'accueil_protege');

insert into family_members (id, family_id, name, role, access_status, age, signature_color)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Parent 1', 'parent', null, null, 'sauge'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Parent 2', 'parent', null, null, 'ardoise'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Enfant 1', 'enfant', 'managed', 9, 'prune');

insert into task_categories (family_id, name, necessite_contact_lieu) values
  ('00000000-0000-0000-0000-000000000001', 'Santé', true),
  ('00000000-0000-0000-0000-000000000001', 'École', true),
  ('00000000-0000-0000-0000-000000000001', 'Administratif', true),
  ('00000000-0000-0000-0000-000000000001', 'Maison', false);

insert into tasks (family_id, title, due_date, subject_id, actor_id, assignment_status)
values
  ('00000000-0000-0000-0000-000000000001', 'Sortir les poubelles', current_date, '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'auto_assignee'),
  ('00000000-0000-0000-0000-000000000001', 'Relevé bancaire', current_date, '00000000-0000-0000-0000-000000000012', null, 'a_decider'),
  ('00000000-0000-0000-0000-000000000001', 'Devoirs de lecture', current_date - 1, '00000000-0000-0000-0000-000000000013', null, 'assignee');

insert into budget_categories (family_id, name, target_amount, show_on_home) values
  ('00000000-0000-0000-0000-000000000001', 'Courses', 12000, true),
  ('00000000-0000-0000-0000-000000000001', 'Loisirs', 15000, true),
  ('00000000-0000-0000-0000-000000000001', 'Logement', null, false),
  ('00000000-0000-0000-0000-000000000001', 'Assurances', null, false);

insert into budget_lines (family_id, category_id, financial_type, amount, periodicity, responsible_id, validation_status)
select '00000000-0000-0000-0000-000000000001', id, 'fixe_fixe', 98000, 'mensuel', '00000000-0000-0000-0000-000000000011', 'validee'
from budget_categories where family_id = '00000000-0000-0000-0000-000000000001' and name = 'Logement';

insert into budget_lines (family_id, category_id, financial_type, amount, responsible_id, validation_status, spent_on)
select '00000000-0000-0000-0000-000000000001', id, 'variable_prevue', 8500, '00000000-0000-0000-0000-000000000011', 'validee', current_date
from budget_categories where family_id = '00000000-0000-0000-0000-000000000001' and name = 'Courses';

insert into budget_lines (family_id, category_id, financial_type, amount, responsible_id, validation_status, spent_on)
select '00000000-0000-0000-0000-000000000001', id, 'variable_prevue', 6000, '00000000-0000-0000-0000-000000000012', 'validee', current_date
from budget_categories where family_id = '00000000-0000-0000-0000-000000000001' and name = 'Loisirs';

-- One fixed charge already marked paid this month, one still pending → the home
-- screen's status dot should show "orange" (at least one processed).
insert into budget_line_cycles (budget_line_id, period_month, status, paid_at)
select id, date_trunc('month', current_date)::date, 'paye', now()
from budget_lines
where family_id = '00000000-0000-0000-0000-000000000001' and financial_type = 'fixe_fixe';
