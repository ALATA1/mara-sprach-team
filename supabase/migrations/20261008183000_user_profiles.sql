alter table public.profiles
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists birth_date date,
  add column if not exists preferred_language text not null default 'fr'
    check (preferred_language in ('fr', 'de', 'en')),
  add column if not exists german_level text
    check (german_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
