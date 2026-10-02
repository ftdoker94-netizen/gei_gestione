-- Controllo di gestione GEI — struttura iniziale.
-- Da incollare ed eseguire nel SQL Editor di Supabase (una volta sola).

create table if not exists public.docs (
  col         text        not null,              -- cantieri, costi, sal, sub, ore, operai, regole, scad, clienti, preventivi, config
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        default auth.uid(),
  primary key (col, id)
);
create index if not exists docs_col_idx on public.docs (col);

create or replace function public.touch_docs() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs
for each row execute function public.touch_docs();

-- Sicurezza: solo utenti con login (creati da te in Authentication → Users) leggono e scrivono.
alter table public.docs enable row level security;

drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;
create policy "docs_select" on public.docs for select to authenticated using (true);
create policy "docs_insert" on public.docs for insert to authenticated with check (true);
create policy "docs_update" on public.docs for update to authenticated using (true) with check (true);
create policy "docs_delete" on public.docs for delete to authenticated using (true);

-- Aggiornamento in tempo reale tra telefono e computer.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;
