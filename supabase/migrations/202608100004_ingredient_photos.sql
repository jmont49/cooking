alter table public.ingredients
  add column if not exists photo_url text,
  add column if not exists photo_attribution jsonb;
