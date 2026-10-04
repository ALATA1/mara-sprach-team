create table if not exists public.course_documents (
  id uuid primary key default gen_random_uuid(),
  course_key text not null check (course_key ~ '^[a-zA-Z0-9_-]{1,60}$'),
  title text not null check (char_length(title) between 1 and 120),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists course_documents_course_created_idx
  on public.course_documents (course_key, created_at desc);

alter table public.course_documents enable row level security;

grant select on public.course_documents to anon, authenticated;

drop policy if exists "published course documents are readable" on public.course_documents;
create policy "published course documents are readable"
  on public.course_documents
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-documents',
  'course-documents',
  true,
  15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course documents can be downloaded" on storage.objects;
create policy "course documents can be downloaded"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'course-documents');
