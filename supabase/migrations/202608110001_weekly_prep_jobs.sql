create table public.weekly_prep_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  source_fingerprint text not null,
  status text not null default 'queued' check(status in ('queued','processing','ready','failed')),
  request jsonb not null,
  prep_plan jsonb,
  completed_task_ids text[] not null default '{}',
  error_code text,
  attempt_count integer not null default 0 check(attempt_count between 0 and 5),
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index weekly_prep_jobs_user_week_idx on public.weekly_prep_jobs(user_id,week_start,created_at desc);
create index weekly_prep_jobs_claim_idx on public.weekly_prep_jobs(status,created_at) where status in ('queued','processing');

alter table public.weekly_prep_jobs enable row level security;
create policy "weekly prep job owner read" on public.weekly_prep_jobs for select to authenticated using(user_id=auth.uid());

create or replace function public.claim_weekly_prep_job(p_user uuid)
returns setof public.weekly_prep_jobs
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  select id into v_id from public.weekly_prep_jobs
  where user_id=p_user and attempt_count<5 and (status='queued' or (status='processing' and lease_expires_at<now()))
  order by created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  return query update public.weekly_prep_jobs
    set status='processing',attempt_count=attempt_count+1,lease_expires_at=now()+interval '5 minutes',updated_at=now(),error_code=null
    where id=v_id returning *;
end $$;

grant select on public.weekly_prep_jobs to authenticated;
grant all privileges on public.weekly_prep_jobs to service_role;
revoke all on function public.claim_weekly_prep_job(uuid) from public,anon,authenticated;
grant execute on function public.claim_weekly_prep_job(uuid) to service_role;
