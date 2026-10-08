insert into public.courses (id, title, language, level, description, published)
values
  (
    'a10a0000-0000-4000-8000-000000000001',
    'Français pratique',
    'fr',
    'A1',
    'Cours de démonstration local pour tester les inscriptions et les contenus.',
    true
  ),
  (
    'a10a0000-0000-4000-8000-000000000002',
    'Deutsch im Alltag',
    'de',
    'A1',
    'Lokaler Demokurs zum Testen der Kursinhalte.',
    true
  )
on conflict (id) do update set
  title = excluded.title,
  language = excluded.language,
  level = excluded.level,
  description = excluded.description,
  published = excluded.published;

insert into public.course_lessons (id, course_id, title, position, duration_seconds)
values
  (
    'a10a0000-0000-4000-8000-000000000011',
    'a10a0000-0000-4000-8000-000000000001',
    'Se présenter',
    1,
    600
  ),
  (
    'a10a0000-0000-4000-8000-000000000012',
    'a10a0000-0000-4000-8000-000000000002',
    'Sich vorstellen',
    1,
    600
  )
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  position = excluded.position,
  duration_seconds = excluded.duration_seconds;

insert into public.live_sessions (id, course_id, title, start_at, end_at, meeting_url, capacity)
values
  (
    'a10a0000-0000-4000-8000-000000000021',
    'a10a0000-0000-4000-8000-000000000001',
    'Conversation française A1 — test local',
    now() + interval '2 days',
    now() + interval '2 days 1 hour',
    'https://example.com/local-live-fr',
    12
  ),
  (
    'a10a0000-0000-4000-8000-000000000022',
    'a10a0000-0000-4000-8000-000000000002',
    'Deutsch sprechen A1 — lokaler Test',
    now() + interval '4 days',
    now() + interval '4 days 1 hour',
    'https://example.com/local-live-de',
    12
  )
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  meeting_url = excluded.meeting_url,
  capacity = excluded.capacity;
