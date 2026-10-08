alter table public.live_sessions
  add column if not exists teacher_id uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'completed')),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists live_sessions_teacher_start_idx
  on public.live_sessions (teacher_id, start_at);

create table if not exists public.live_attendance (
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  attended boolean not null,
  recorded_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (live_session_id, student_id)
);

alter table public.live_attendance enable row level security;
revoke all on public.live_attendance from anon, authenticated;
grant all on public.live_attendance to service_role;

create or replace function public.register_for_live_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity integer;
  v_start_at timestamptz;
  v_status text;
  v_registered_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not public.has_course_access() then
    raise exception using errcode = '42501', message = 'An active course subscription is required';
  end if;

  select capacity, start_at, status
    into v_capacity, v_start_at, v_status
    from public.live_sessions
    where id = p_session_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Live session not found';
  end if;

  if v_status <> 'scheduled' or v_start_at <= now() then
    raise exception using errcode = '22023', message = 'Registration is closed for this session';
  end if;

  if exists (
    select 1
    from public.live_registrations
    where live_session_id = p_session_id
      and user_id = v_user_id
  ) then
    return;
  end if;

  select count(*)::integer
    into v_registered_count
    from public.live_registrations
    where live_session_id = p_session_id;

  if v_registered_count >= v_capacity then
    raise exception using errcode = '23514', message = 'This live session is full';
  end if;

  insert into public.live_registrations (live_session_id, user_id)
  values (p_session_id, v_user_id);
end;
$$;

create or replace function public.cancel_live_session_registration(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_start_at timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select start_at
    into v_start_at
    from public.live_sessions
    where id = p_session_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Live session not found';
  end if;

  if v_start_at <= now() then
    raise exception using errcode = '22023', message = 'Cancellation is closed for this session';
  end if;

  delete from public.live_registrations
    where live_session_id = p_session_id
      and user_id = v_user_id;
end;
$$;
