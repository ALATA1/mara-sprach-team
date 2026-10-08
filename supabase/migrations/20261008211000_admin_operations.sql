create table if not exists public.staff_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.staff_audit_log enable row level security;
revoke all on public.staff_audit_log from anon, authenticated;
grant all on public.staff_audit_log to service_role;

create or replace function public.admin_set_profile_role(
  p_actor_id uuid,
  p_target_id uuid,
  p_new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_role public.app_role;
begin
  perform pg_advisory_xact_lock(hashtext('mara-profile-role-administration'));

  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;

  select role into v_old_role
    from public.profiles
    where id = p_target_id
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;

  if v_old_role = 'admin' and p_new_role <> 'admin' and
    (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception using errcode = '23514', message = 'Cannot remove the last administrator';
  end if;

  update public.profiles set role = p_new_role where id = p_target_id;
  insert into public.staff_audit_log (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'profile.role.updated', 'profile', p_target_id::text,
    jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role));
end;
$$;

revoke all on function public.admin_set_profile_role(uuid, uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.admin_set_profile_role(uuid, uuid, public.app_role) to service_role;

create table if not exists public.admin_refund_actions (
  id uuid primary key,
  payment_id uuid not null references public.payments(id) on delete restrict,
  requested_by uuid not null references auth.users(id),
  reason text not null check (length(trim(reason)) between 3 and 500),
  status text not null default 'pending' check (status in ('pending', 'succeeded')),
  stripe_refund_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_refund_actions_payment_idx
  on public.admin_refund_actions (payment_id, created_at desc);
alter table public.admin_refund_actions enable row level security;
revoke all on public.admin_refund_actions from anon, authenticated;
grant all on public.admin_refund_actions to service_role;
