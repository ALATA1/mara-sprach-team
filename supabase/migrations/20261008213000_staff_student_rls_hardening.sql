drop policy if exists "active subscribers register for live sessions" on public.live_registrations;
drop policy if exists "users update own live registrations" on public.live_registrations;
drop policy if exists "users delete own live registrations" on public.live_registrations;

revoke all on public.live_registrations from anon, authenticated;
grant select on public.live_registrations to authenticated;

drop policy if exists "own support requests" on public.support_requests;
drop policy if exists "users read own support requests" on public.support_requests;
drop policy if exists "users create own support requests" on public.support_requests;

revoke all on public.support_requests from anon, authenticated;
grant select, insert on public.support_requests to authenticated;

create policy "users read own support requests"
  on public.support_requests for select to authenticated
  using (auth.uid() = user_id);

create policy "users create own support requests"
  on public.support_requests for insert to authenticated
  with check (auth.uid() = user_id);
