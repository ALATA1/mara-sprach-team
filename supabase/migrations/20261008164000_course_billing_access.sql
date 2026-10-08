-- Add subscription billing and enforce course access for active subscribers.
alter table public.payments
  add column if not exists provider_invoice_id text unique,
  add column if not exists hosted_invoice_url text,
  add column if not exists invoice_pdf_url text;

create table if not exists public.course_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text not null,
  provider_subscription_id text unique,
  provider_checkout_session_id text unique,
  plan_id text not null check (plan_id in ('discovery', 'standard', 'premium')),
  status text not null default 'checkout_pending'
    check (status in ('checkout_pending', 'checkout_failed', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_subscriptions_user_created_idx
  on public.course_subscriptions (user_id, created_at desc);
create index if not exists course_subscriptions_customer_idx
  on public.course_subscriptions (provider_customer_id);
create unique index if not exists course_subscriptions_one_open_per_user_idx
  on public.course_subscriptions (user_id)
  where status in ('checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'paused');

alter table public.course_subscriptions enable row level security;
revoke all on public.course_subscriptions from anon, authenticated;
grant select on public.course_subscriptions to authenticated;
grant all on public.course_subscriptions to service_role;

drop policy if exists "users read own course subscriptions" on public.course_subscriptions;
create policy "users read own course subscriptions"
  on public.course_subscriptions for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_course_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('teacher', 'admin')
    )
    or exists (
      select 1
      from public.memberships
      join public.course_subscriptions on course_subscriptions.user_id = memberships.user_id
      where memberships.user_id = auth.uid()
        and memberships.status = 'active'
        and course_subscriptions.status = 'active'
    );
$$;

revoke all on function public.has_course_access() from public, anon;
grant execute on function public.has_course_access() to authenticated, service_role;

drop policy if exists "members and teachers read course lessons" on public.course_lessons;
create policy "active subscribers and teachers read course lessons"
  on public.course_lessons for select to authenticated
  using (
    public.has_course_access()
    and exists (
      select 1 from public.courses
      where courses.id = course_lessons.course_id
        and (courses.published = true or courses.teacher_id = auth.uid())
    )
  );

drop policy if exists "public live sessions" on public.live_sessions;
create policy "active subscribers and staff read live sessions"
  on public.live_sessions for select to authenticated
  using (public.has_course_access());

drop policy if exists "own live registrations" on public.live_registrations;
create policy "users read own live registrations"
  on public.live_registrations for select to authenticated
  using (auth.uid() = user_id);
create policy "active subscribers register for live sessions"
  on public.live_registrations for insert to authenticated
  with check (auth.uid() = user_id and public.has_course_access());
create policy "users update own live registrations"
  on public.live_registrations for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "users delete own live registrations"
  on public.live_registrations for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own progress" on public.lesson_progress;
create policy "active subscribers manage own lesson progress"
  on public.lesson_progress for all to authenticated
  using (auth.uid() = user_id and public.has_course_access())
  with check (auth.uid() = user_id and public.has_course_access());

drop policy if exists "published course documents are readable" on public.course_documents;
revoke select on public.course_documents from anon;
grant select on public.course_documents to authenticated;
create policy "active subscribers read course documents"
  on public.course_documents for select to authenticated
  using (public.has_course_access());

update storage.buckets
set public = false
where id = 'course-documents';

drop policy if exists "course documents can be downloaded" on storage.objects;
create policy "active subscribers download course documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'course-documents' and public.has_course_access());
