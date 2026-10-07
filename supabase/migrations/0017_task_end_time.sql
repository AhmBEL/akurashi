-- Tranche 6 (agenda) : heure de fin facultative d'une tâche / d'un rendez-vous.
-- Elle sert au « temps occupé » : un élément avec début et fin dessine une
-- bande discrète dans l'agenda. Sans heure de début, pas d'heure de fin.
alter table tasks
  add column due_end_time time,
  add constraint tasks_end_after_start
    check (due_end_time is null or (due_time is not null and due_end_time > due_time));
