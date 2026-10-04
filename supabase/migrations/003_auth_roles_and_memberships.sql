alter table public.memberships
  add column if not exists stripe_session_id text unique;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    'beneficiary'
  )
  on conflict (id) do nothing;

  insert into public.memberships (user_id, status, amount_cents)
  values (new.id, 'pending', 1000)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

insert into public.profiles (id, first_name, last_name, role)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'first_name', ''),
  coalesce(users.raw_user_meta_data ->> 'last_name', ''),
  'beneficiary'
from auth.users as users
on conflict (id) do nothing;

insert into public.memberships (user_id, status, amount_cents)
select users.id, 'pending', 1000
from auth.users as users
on conflict (user_id) do nothing;

grant update (first_name, last_name) on public.profiles to authenticated;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "teachers read their courses" on public.courses;
create policy "teachers read their courses"
  on public.courses for select to authenticated
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teachers create their courses" on public.courses;
create policy "teachers create their courses"
  on public.courses for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teachers update their courses" on public.courses;
create policy "teachers update their courses"
  on public.courses for update to authenticated
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teachers delete their courses" on public.courses;
create policy "teachers delete their courses"
  on public.courses for delete to authenticated
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "members and teachers read course lessons" on public.course_lessons;
create policy "members and teachers read course lessons"
  on public.course_lessons for select to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_lessons.course_id
        and (
          courses.teacher_id = auth.uid()
          or (
            courses.published = true
            and exists (
              select 1 from public.memberships
              where memberships.user_id = auth.uid()
                and memberships.status = 'active'
            )
          )
        )
    )
  );

drop policy if exists "teachers manage their course lessons" on public.course_lessons;
create policy "teachers manage their course lessons"
  on public.course_lessons for all to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_lessons.course_id
        and courses.teacher_id = auth.uid()
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  )
  with check (
    exists (
      select 1 from public.courses
      where courses.id = course_lessons.course_id
        and courses.teacher_id = auth.uid()
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  );
