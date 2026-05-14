alter table public.improvement_tasks
  add column if not exists resolution_note text,
  add column if not exists resolution_photo_urls text[] not null default '{}'::text[];
