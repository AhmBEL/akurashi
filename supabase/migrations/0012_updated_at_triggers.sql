-- Le SupabaseStore (couche d'accès unique) n'envoie pas updated_at : la base
-- le maintient elle-même sur chaque table qui possède cette colonne.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      target.table_name
    );
  end loop;
end;
$$;
