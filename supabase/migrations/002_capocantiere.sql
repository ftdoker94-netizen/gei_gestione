-- Accesso limitato per il capocantiere (app "Rapportini"). Da eseguire una volta nel SQL Editor di Supabase.
-- Il capocantiere vede solo i nomi di cantieri e operai e gli ultimi 30 giorni di ore: niente importi, SAL, costi orari.
-- Si revoca dal gestionale (Opzioni → Capocantiere) o cancellando l'utente in Authentication → Users.

create table if not exists public.capi (
  email  text primary key,              -- sempre in minuscolo
  nome   text,
  attivo boolean not null default true,
  creato timestamptz not null default now()
);
alter table public.capi enable row level security;

create or replace function public.mail() returns text
language sql stable as $$ select lower(coalesce(auth.jwt()->>'email','')) $$;

create or replace function public.capo_row() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.capi where email = public.mail()) $$;

create or replace function public.capo_ok() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.capi where email = public.mail() and attivo) $$;

-- Chi è nella lista capocantiere NON può usare direttamente le tabelle (né quando è disattivato).
drop policy if exists "capi_all" on public.capi;
create policy "capi_all" on public.capi for all to authenticated
  using (not public.capo_row()) with check (not public.capo_row());

drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;
create policy "docs_select" on public.docs for select to authenticated using (not public.capo_row());
create policy "docs_insert" on public.docs for insert to authenticated with check (not public.capo_row());
create policy "docs_update" on public.docs for update to authenticated using (not public.capo_row()) with check (not public.capo_row());
create policy "docs_delete" on public.docs for delete to authenticated using (not public.capo_row());

-- Dati che il capocantiere può leggere.
create or replace function public.capo_dati() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.capo_ok() then raise exception 'non autorizzato'; end if;
  return jsonb_build_object(
    'cantieri', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',data->>'nome') order by data->>'nome'),'[]'::jsonb)
                 from docs where col='cantieri' and coalesce(data->>'stato','')<>'chiuso'),
    'operai',   (select coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',data->>'nome') order by data->>'nome'),'[]'::jsonb)
                 from docs where col='operai'),
    'ore',      (select coalesce(jsonb_agg(jsonb_build_object('id',id,'cantiereId',data->>'cantiereId','operaioId',data->>'operaioId',
                   'operaio',data->>'operaio','data',data->>'data','ore',data->'ore','descrizione',data->>'descrizione',
                   'mio',(data->>'daCapo')=public.mail()) order by data->>'data' desc, id),'[]'::jsonb)
                 from docs where col='ore' and data->>'data' >= to_char(current_date-30,'YYYY-MM-DD'))
  );
end $$;

-- Inserisce o corregge un rapportino (solo uno inserito da lui).
create or replace function public.capo_salva_ora(p_id text, p_cantiere text, p_operaio text, p_data text, p_ore numeric, p_desc text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text; v_nome text; v_costo numeric; v_old jsonb;
begin
  if not public.capo_ok() then raise exception 'non autorizzato'; end if;
  if p_ore is null or p_ore <= 0 or p_ore > 24 then raise exception 'ore non valide'; end if;
  if p_data !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'data non valida'; end if;
  if not exists (select 1 from docs where col='cantieri' and id=p_cantiere) then raise exception 'cantiere inesistente'; end if;
  select data->>'nome', coalesce(nullif(data->>'costoOrario','')::numeric,0) into v_nome, v_costo
    from docs where col='operai' and id=p_operaio;
  if v_nome is null then raise exception 'operaio inesistente'; end if;
  if coalesce(p_id,'') <> '' then
    select data into v_old from docs where col='ore' and id=p_id;
    if v_old is null or coalesce(v_old->>'daCapo','') <> public.mail() then raise exception 'rapportino non modificabile'; end if;
    v_id := p_id;
  else
    v_id := 'o' || substr(md5(random()::text || clock_timestamp()::text), 1, 11);
    v_old := '{}'::jsonb;
  end if;
  insert into docs(col,id,data) values ('ore', v_id, v_old || jsonb_build_object(
      'cantiereId',p_cantiere,'operaioId',p_operaio,'operaio',v_nome,'data',p_data,'ore',p_ore,
      'descrizione',coalesce(p_desc,''),'costoOrario',v_costo,'daCapo',public.mail()))
  on conflict (col,id) do update set data = excluded.data;
  return v_id;
end $$;

create or replace function public.capo_elimina_ora(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.capo_ok() then raise exception 'non autorizzato'; end if;
  delete from docs where col='ore' and id=p_id and data->>'daCapo' = public.mail();
end $$;

revoke all on function public.capo_dati() from public, anon;
revoke all on function public.capo_salva_ora(text,text,text,text,numeric,text) from public, anon;
revoke all on function public.capo_elimina_ora(text) from public, anon;
grant execute on function public.capo_dati() to authenticated;
grant execute on function public.capo_salva_ora(text,text,text,text,numeric,text) to authenticated;
grant execute on function public.capo_elimina_ora(text) to authenticated;
