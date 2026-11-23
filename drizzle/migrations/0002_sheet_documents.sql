
comment on table public.training_logs is 'DEPRECATED: replaced by mesocycle_sheets.data';
comment on table public.anthropometrics is 'DEPRECATED: replaced by mesocycle_sheets.data';
comment on table public.jump_tests is 'DEPRECATED: replaced by mesocycle_sheets.data';
comment on table public.program_exercises is 'DEPRECATED: replaced by mesocycle_sheets.data';
comment on column public.mesocycles.weeks is 'DEPRECATED: week count lives in mesocycle_sheets.data';

create table public.mesocycle_sheets (
  mesocycle_id uuid primary key references public.mesocycles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  data jsonb,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);
create index mesocycle_sheets_client_idx on public.mesocycle_sheets (client_id);
grant select, insert, update, delete on public.mesocycle_sheets to authenticated;
grant all on public.mesocycle_sheets to service_role;
alter table public.mesocycle_sheets enable row level security;

create policy "Coach manages sheets" on public.mesocycle_sheets for all to authenticated
  using (public.is_client_coach(client_id)) with check (public.is_client_coach(client_id));
create policy "Athlete reads published sheets" on public.mesocycle_sheets for select to authenticated
  using (public.is_client_athlete(client_id) and exists (
    select 1 from public.mesocycles m where m.id = mesocycle_id and m.status = 'published'));
create policy "Athlete fills published sheets" on public.mesocycle_sheets for update to authenticated
  using (public.is_client_athlete(client_id) and exists (
    select 1 from public.mesocycles m where m.id = mesocycle_id and m.status = 'published'))
  with check (public.is_client_athlete(client_id) and exists (
    select 1 from public.mesocycles m where m.id = mesocycle_id and m.status = 'published'));

create or replace function public.mesocycle_sheets_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select client_id into new.client_id from public.mesocycles where id = new.mesocycle_id;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
create trigger mesocycle_sheets_stamp before insert or update on public.mesocycle_sheets
  for each row execute function public.mesocycle_sheets_stamp();

create or replace function public.sheet_num(_v text)
returns numeric language sql immutable set search_path = public as $$
  select case when c ~ '^-?[0-9]+(\.[0-9]+)?$' then c::numeric end
  from (select regexp_replace(replace(coalesce(_v, ''), ',', '.'), '[^0-9.\-]', '', 'g') as c) s
$$;

-- Best kg per tracked lift and best value per jump test in a v6 sheet
create or replace function public.sheet_bests(_data jsonb)
returns table(section text, name text, best numeric)
language sql immutable set search_path = public as $$
  select 'kg', lower(trim(l->>'label')), max(public.sheet_num(t->>'kg'))
  from jsonb_array_elements(coalesce(_data->'lifts', '[]'::jsonb)) l
  cross join lateral jsonb_array_elements(coalesce(_data->'tracker'->(l->>'id'), '[]'::jsonb)) t
  where coalesce(trim(l->>'label'), '') <> ''
  group by lower(trim(l->>'label'))
  having max(public.sheet_num(t->>'kg')) is not null
  union all
  select 'jump', lower(trim(j->>'name')), max(public.sheet_num(w))
  from jsonb_array_elements(coalesce(_data->'metrics'->'jumps', '[]'::jsonb)) j
  cross join lateral jsonb_array_elements_text(coalesce(j->'weeks', '[]'::jsonb)) w
  where coalesce(trim(j->>'name'), '') <> ''
  group by lower(trim(j->>'name'))
  having max(public.sheet_num(w)) is not null
$$;

create or replace function public.mesocycle_sheets_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _coach uuid; _client_name text; _rec record; _prev numeric; _unit text;
begin
  select coach_id, full_name into _coach, _client_name from public.clients where id = new.client_id;
  if _coach is null or auth.uid() is null or auth.uid() = _coach then return new; end if;
  if new.data is not distinct from old.data then return new; end if;

  for _rec in select * from public.sheet_bests(new.data) loop
    select max(x.best) into _prev from (
      select m.best from public.sheet_bests(old.data) m
        where m.section = _rec.section and m.name = _rec.name
      union all
      select m.best from public.mesocycle_sheets s
        cross join lateral public.sheet_bests(s.data) m
        where s.client_id = new.client_id and s.mesocycle_id <> new.mesocycle_id
          and m.section = _rec.section and m.name = _rec.name
    ) x;
    if _prev is not null and _rec.best > _prev then
      _unit := case _rec.section when 'kg' then ' kg' else ' cm' end;
      insert into public.notifications (user_id, client_id, type, title, body)
      values (_coach, new.client_id, 'pr', _client_name || ' ha battuto un record!',
        initcap(_rec.name) || ': ' || _rec.best || _unit || ' (prima ' || _prev || _unit || ')');
    end if;
  end loop;

  if not exists (
    select 1 from public.notifications
    where user_id = _coach and client_id = new.client_id and type = 'entry'
      and created_at > now() - interval '3 hours'
  ) then
    insert into public.notifications (user_id, client_id, type, title, body)
    values (_coach, new.client_id, 'entry', _client_name || ' ha compilato la scheda',
      'Apri la cartella per vedere gli aggiornamenti');
  end if;
  return new;
end $$;
create trigger mesocycle_sheets_notify after update on public.mesocycle_sheets
  for each row execute function public.mesocycle_sheets_notify();
