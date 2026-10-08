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
  v_registered_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not public.has_course_access() then
    raise exception using errcode = '42501', message = 'An active course subscription is required';
  end if;

  select capacity, start_at
    into v_capacity, v_start_at
    from public.live_sessions
    where id = p_session_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Live session not found';
  end if;

  if v_start_at <= now() then
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

revoke all on function public.register_for_live_session(uuid) from public, anon;
revoke all on function public.cancel_live_session_registration(uuid) from public, anon;
grant execute on function public.register_for_live_session(uuid) to authenticated;
grant execute on function public.cancel_live_session_registration(uuid) to authenticated;
