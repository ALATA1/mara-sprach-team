create table public.student_learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_key text not null check (length(course_key) between 1 and 100),
  item_type text not null check (item_type in ('lesson', 'quiz')),
  item_key text not null check (length(item_key) between 1 and 100),
  score_percentage smallint check (score_percentage between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_key, item_type, item_key),
  check (
    (item_type = 'lesson' and score_percentage is null and completed_at is not null)
    or (item_type = 'quiz' and score_percentage is not null)
  )
);

create index student_learning_records_user_updated_idx
  on public.student_learning_records (user_id, updated_at desc);

alter table public.student_learning_records enable row level security;
revoke all on public.student_learning_records from anon, authenticated;
grant select, insert, update on public.student_learning_records to authenticated;

create policy "students read own learning records"
  on public.student_learning_records for select to authenticated
  using (auth.uid() = user_id and public.has_course_access());

create policy "students create own learning records"
  on public.student_learning_records for insert to authenticated
  with check (auth.uid() = user_id and public.has_course_access());

create policy "students update own learning records"
  on public.student_learning_records for update to authenticated
  using (auth.uid() = user_id and public.has_course_access())
  with check (auth.uid() = user_id and public.has_course_access());
