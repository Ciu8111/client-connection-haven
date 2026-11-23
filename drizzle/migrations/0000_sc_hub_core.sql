
-- Roles
create type public.app_role as enum ('coach', 'athlete');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid(),
  full_name text not null,
  email text not null,
  athlete_user_id uuid,
  sport text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  unique (coach_id, email)
);
create index clients_email_idx on public.clients (lower(email));
create index clients_athlete_idx on public.clients (athlete_user_id);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

create or replace function public.is_client_coach(_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients where id = _client and coach_id = auth.uid())
$$;
create or replace function public.is_client_athlete(_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients where id = _client and athlete_user_id = auth.uid())
$$;
create or replace function public.can_access_client(_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients where id = _client and (coach_id = auth.uid() or athlete_user_id = auth.uid()))
$$;

create policy "Coach manages own clients" on public.clients for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.has_role(auth.uid(), 'coach'));
create policy "Athlete reads own folder" on public.clients for select to authenticated
  using (athlete_user_id = auth.uid());

-- Normalize email, link existing account on insert/update
create or replace function public.clients_link_athlete()
returns trigger language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  new.email := lower(trim(new.email));
  if new.athlete_user_id is null then
    select id into _uid from auth.users where lower(email) = new.email limit 1;
    if _uid is not null and _uid <> new.coach_id then
      new.athlete_user_id := _uid;
      insert into public.user_roles (user_id, role) values (_uid, 'athlete') on conflict do nothing;
      if not exists (select 1 from public.clients where coach_id = _uid) then
        delete from public.user_roles where user_id = _uid and role = 'coach';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger clients_link_athlete before insert or update of email on public.clients
  for each row execute function public.clients_link_athlete();

-- New user: profile + role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _linked int;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), lower(new.email))
  on conflict (id) do nothing;

  update public.clients set athlete_user_id = new.id
  where lower(email) = lower(new.email) and athlete_user_id is null;
  get diagnostics _linked = row_count;

  if _linked > 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'athlete') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'coach') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mesocycles
create table public.mesocycles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  goal text,
  start_date date,
  weeks int not null default 4,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now()
);
create index mesocycles_client_idx on public.mesocycles (client_id);
grant select, insert, update, delete on public.mesocycles to authenticated;
grant all on public.mesocycles to service_role;
alter table public.mesocycles enable row level security;
create policy "Coach manages mesocycles" on public.mesocycles for all to authenticated
  using (public.is_client_coach(client_id)) with check (public.is_client_coach(client_id));
create policy "Athlete reads published mesocycles" on public.mesocycles for select to authenticated
  using (status = 'published' and public.is_client_athlete(client_id));

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  mesocycle_id uuid not null references public.mesocycles(id) on delete cascade,
  day_label text not null default 'Giorno A',
  position int not null default 0,
  exercise text not null,
  sets int,
  reps text,
  intensity text,
  rest text,
  notes text,
  created_at timestamptz not null default now()
);
create index program_exercises_meso_idx on public.program_exercises (mesocycle_id);
grant select, insert, update, delete on public.program_exercises to authenticated;
grant all on public.program_exercises to service_role;
alter table public.program_exercises enable row level security;
create policy "Coach manages program exercises" on public.program_exercises for all to authenticated
  using (exists (select 1 from public.mesocycles m where m.id = mesocycle_id and public.is_client_coach(m.client_id)))
  with check (exists (select 1 from public.mesocycles m where m.id = mesocycle_id and public.is_client_coach(m.client_id)));
create policy "Athlete reads published program" on public.program_exercises for select to authenticated
  using (exists (select 1 from public.mesocycles m where m.id = mesocycle_id and m.status = 'published' and public.is_client_athlete(m.client_id)));

-- Training logs
create table public.training_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  mesocycle_id uuid references public.mesocycles(id) on delete set null,
  exercise text not null,
  performed_on date not null default current_date,
  week int,
  set_number int,
  load_kg numeric not null,
  reps int not null,
  rpe numeric,
  e1rm numeric generated always as (round(load_kg * (1 + reps::numeric / 30), 1)) stored,
  is_pr boolean not null default false,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index training_logs_client_idx on public.training_logs (client_id, exercise);
grant select, insert, update, delete on public.training_logs to authenticated;
grant all on public.training_logs to service_role;
alter table public.training_logs enable row level security;
create policy "Coach manages logs" on public.training_logs for all to authenticated
  using (public.is_client_coach(client_id)) with check (public.is_client_coach(client_id));
create policy "Athlete reads own logs" on public.training_logs for select to authenticated
  using (public.is_client_athlete(client_id));
create policy "Athlete inserts own logs" on public.training_logs for insert to authenticated
  with check (public.is_client_athlete(client_id) and created_by = auth.uid());
create policy "Athlete updates own logs" on public.training_logs for update to authenticated
  using (public.is_client_athlete(client_id) and created_by = auth.uid())
  with check (public.is_client_athlete(client_id) and created_by = auth.uid());
create policy "Athlete deletes own logs" on public.training_logs for delete to authenticated
  using (public.is_client_athlete(client_id) and created_by = auth.uid());

-- Anthropometrics
create table public.anthropometrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  measured_on date not null default current_date,
  body_weight_kg numeric,
  height_cm numeric,
  body_fat_pct numeric,
  waist_cm numeric,
  hip_cm numeric,
  chest_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index anthropometrics_client_idx on public.anthropometrics (client_id);
grant select, insert, update, delete on public.anthropometrics to authenticated;
grant all on public.anthropometrics to service_role;
alter table public.anthropometrics enable row level security;
create policy "Coach manages anthropometrics" on public.anthropometrics for all to authenticated
  using (public.is_client_coach(client_id)) with check (public.is_client_coach(client_id));
create policy "Athlete reads own anthropometrics" on public.anthropometrics for select to authenticated
  using (public.is_client_athlete(client_id));
create policy "Athlete writes own anthropometrics" on public.anthropometrics for insert to authenticated
  with check (public.is_client_athlete(client_id) and created_by = auth.uid());
create policy "Athlete deletes own anthropometrics" on public.anthropometrics for delete to authenticated
  using (public.is_client_athlete(client_id) and created_by = auth.uid());

-- Jump tests
create table public.jump_tests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tested_on date not null default current_date,
  test_type text not null,
  value numeric not null,
  unit text not null default 'cm',
  is_pr boolean not null default false,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index jump_tests_client_idx on public.jump_tests (client_id, test_type);
grant select, insert, update, delete on public.jump_tests to authenticated;
grant all on public.jump_tests to service_role;
alter table public.jump_tests enable row level security;
create policy "Coach manages jumps" on public.jump_tests for all to authenticated
  using (public.is_client_coach(client_id)) with check (public.is_client_coach(client_id));
create policy "Athlete reads own jumps" on public.jump_tests for select to authenticated
  using (public.is_client_athlete(client_id));
create policy "Athlete writes own jumps" on public.jump_tests for insert to authenticated
  with check (public.is_client_athlete(client_id) and created_by = auth.uid());
create policy "Athlete deletes own jumps" on public.jump_tests for delete to authenticated
  using (public.is_client_athlete(client_id) and created_by = auth.uid());

-- Files
create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.client_files to authenticated;
grant all on public.client_files to service_role;
alter table public.client_files enable row level security;
create policy "Folder members read files" on public.client_files for select to authenticated
  using (public.can_access_client(client_id));
create policy "Folder members add files" on public.client_files for insert to authenticated
  with check (public.can_access_client(client_id) and uploaded_by = auth.uid());
create policy "Coach or uploader deletes files" on public.client_files for delete to authenticated
  using (public.is_client_coach(client_id) or uploaded_by = auth.uid());

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid references public.clients(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());
alter publication supabase_realtime add table public.notifications;

-- PR detection
create or replace function public.training_logs_detect_pr()
returns trigger language plpgsql security definer set search_path = public as $$
declare _best numeric;
begin
  select max(e1rm) into _best from public.training_logs
  where client_id = new.client_id and lower(exercise) = lower(new.exercise) and id <> new.id;
  new.is_pr := _best is not null and round(new.load_kg * (1 + new.reps::numeric / 30), 1) > _best;
  return new;
end $$;
create trigger training_logs_detect_pr before insert on public.training_logs
  for each row execute function public.training_logs_detect_pr();

create or replace function public.jump_tests_detect_pr()
returns trigger language plpgsql security definer set search_path = public as $$
declare _best numeric;
begin
  select max(value) into _best from public.jump_tests
  where client_id = new.client_id and lower(test_type) = lower(new.test_type) and id <> new.id;
  new.is_pr := _best is not null and new.value > _best;
  return new;
end $$;
create trigger jump_tests_detect_pr before insert on public.jump_tests
  for each row execute function public.jump_tests_detect_pr();

-- Notify coach when athlete enters data
create or replace function public.notify_coach_on_entry()
returns trigger language plpgsql security definer set search_path = public as $$
declare _coach uuid; _name text; _label text;
begin
  select coach_id, full_name into _coach, _name from public.clients where id = new.client_id;
  if _coach is null or new.created_by = _coach then return new; end if;

  if tg_table_name = 'training_logs' and new.is_pr then
    insert into public.notifications (user_id, client_id, type, title, body)
    values (_coach, new.client_id, 'pr', _name || ' ha battuto un record!',
      new.exercise || ': ' || new.load_kg || ' kg × ' || new.reps || ' (e1RM ' || round(new.load_kg * (1 + new.reps::numeric / 30), 1) || ' kg)');
    return new;
  end if;
  if tg_table_name = 'jump_tests' and new.is_pr then
    insert into public.notifications (user_id, client_id, type, title, body)
    values (_coach, new.client_id, 'pr', _name || ' ha battuto un record!', new.test_type || ': ' || new.value || ' ' || new.unit);
    return new;
  end if;

  _label := case tg_table_name when 'training_logs' then 'il diario allenamenti'
    when 'jump_tests' then 'i test di salto' else 'l''antropometria' end;
  if not exists (
    select 1 from public.notifications
    where user_id = _coach and client_id = new.client_id and type = 'entry'
      and body = _label and created_at > now() - interval '3 hours'
  ) then
    insert into public.notifications (user_id, client_id, type, title, body)
    values (_coach, new.client_id, 'entry', _name || ' ha compilato nuovi dati', _label);
  end if;
  return new;
end $$;
create trigger training_logs_notify after insert on public.training_logs for each row execute function public.notify_coach_on_entry();
create trigger jump_tests_notify after insert on public.jump_tests for each row execute function public.notify_coach_on_entry();
create trigger anthropometrics_notify after insert on public.anthropometrics for each row execute function public.notify_coach_on_entry();
