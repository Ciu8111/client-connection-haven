
create or replace function public.sheet_bests(_data jsonb)
returns table(section text, name text, best numeric)
language sql immutable set search_path = public as $$
  select 'kg', lower(trim(i->>'label')), max(public.sheet_num(v))
  from jsonb_array_elements(coalesce(_data->'kgItems', '[]'::jsonb)) i
  cross join lateral jsonb_array_elements_text(coalesce(i->'values', '[]'::jsonb)) v
  where coalesce(trim(i->>'label'), '') <> ''
  group by lower(trim(i->>'label'))
  having max(public.sheet_num(v)) is not null
  union all
  select 'rep', lower(trim(i->>'label')), max(public.sheet_num(v))
  from jsonb_array_elements(coalesce(_data->'repItems', '[]'::jsonb)) i
  cross join lateral jsonb_array_elements_text(coalesce(i->'values', '[]'::jsonb)) v
  where coalesce(trim(i->>'label'), '') <> ''
  group by lower(trim(i->>'label'))
  having max(public.sheet_num(v)) is not null
  union all
  select 'jump', lower(trim(r->>'name')), max(public.sheet_num(v))
  from jsonb_array_elements(coalesce(_data->'evalData'->'jumps'->'rows', '[]'::jsonb)) r
  cross join lateral jsonb_array_elements_text(coalesce(r->'vals', '[]'::jsonb)) v
  where coalesce(trim(r->>'name'), '') <> ''
  group by lower(trim(r->>'name'))
  having max(public.sheet_num(v)) is not null
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
      _unit := case _rec.section when 'kg' then ' kg' when 'rep' then ' rep' else ' cm' end;
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
