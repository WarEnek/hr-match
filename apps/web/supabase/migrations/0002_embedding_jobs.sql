create table if not exists public.embedding_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  input_text text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  locked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint embedding_jobs_source_unique unique (source_type, source_id)
);

create index if not exists idx_embedding_jobs_profile_id on public.embedding_jobs(profile_id);
create index if not exists idx_embedding_jobs_status_created_at on public.embedding_jobs(status, created_at);

create trigger set_embedding_jobs_updated_at before update on public.embedding_jobs
for each row execute function public.set_updated_at();

alter table public.embedding_jobs enable row level security;

create policy "embedding_jobs_select_own" on public.embedding_jobs for select using (public.owns_profile(profile_id));
create policy "embedding_jobs_insert_own" on public.embedding_jobs for insert with check (public.owns_profile(profile_id));
create policy "embedding_jobs_update_own" on public.embedding_jobs for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "embedding_jobs_delete_own" on public.embedding_jobs for delete using (public.owns_profile(profile_id));
