create extension if not exists vector;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  headline text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  github_url text,
  website_url text,
  summary_default text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,
  years numeric,
  level text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  role_title text not null,
  employment_type text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  domain_tags text[] not null default '{}',
  stack_tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.experience_bullets (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  text_raw text not null,
  text_refined text,
  tech_tags text[] not null default '{}',
  domain_tags text[] not null default '{}',
  result_tags text[] not null default '{}',
  seniority_tags text[] not null default '{}',
  is_verified boolean not null default true,
  embedding vector(1536),
  priority_weight numeric not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  url text,
  domain_tags text[] not null default '{}',
  stack_tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_bullets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  text_raw text not null,
  text_refined text,
  tech_tags text[] not null default '{}',
  domain_tags text[] not null default '{}',
  result_tags text[] not null default '{}',
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  issuer text,
  issued_at date,
  expires_at date,
  credential_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  company text,
  raw_text text not null,
  parsed_json jsonb,
  status text not null default 'created',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vacancy_requirements (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  type text not null,
  label text not null,
  normalized_label text,
  weight numeric not null default 1,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resume_generations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  score numeric,
  document_tree jsonb not null,
  analysis_json jsonb not null,
  pdf_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  resume_generation_id uuid not null references public.resume_generations(id) on delete cascade,
  requirement_id uuid not null references public.vacancy_requirements(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  score numeric not null default 0,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null default 'novita',
  base_url text not null,
  model text not null,
  api_key_encrypted text,
  temperature numeric not null default 0.2,
  max_tokens integer not null default 900,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  resume_generation_id uuid not null references public.resume_generations(id) on delete cascade,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_skills_profile_id on public.skills(profile_id);
create index if not exists idx_experiences_profile_id on public.experiences(profile_id);
create index if not exists idx_experience_bullets_profile_id on public.experience_bullets(profile_id);
create index if not exists idx_projects_profile_id on public.projects(profile_id);
create index if not exists idx_project_bullets_profile_id on public.project_bullets(profile_id);
create index if not exists idx_certifications_profile_id on public.certifications(profile_id);
create index if not exists idx_vacancies_profile_id on public.vacancies(profile_id);
create index if not exists idx_vacancy_requirements_vacancy_id on public.vacancy_requirements(vacancy_id);
create index if not exists idx_resume_generations_profile_id on public.resume_generations(profile_id);
create index if not exists idx_evidence_links_resume_generation_id on public.evidence_links(resume_generation_id);
create index if not exists idx_export_jobs_resume_generation_id on public.export_jobs(resume_generation_id);

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_skills_updated_at before update on public.skills
for each row execute function public.set_updated_at();

create trigger set_experiences_updated_at before update on public.experiences
for each row execute function public.set_updated_at();

create trigger set_experience_bullets_updated_at before update on public.experience_bullets
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_project_bullets_updated_at before update on public.project_bullets
for each row execute function public.set_updated_at();

create trigger set_certifications_updated_at before update on public.certifications
for each row execute function public.set_updated_at();

create trigger set_vacancies_updated_at before update on public.vacancies
for each row execute function public.set_updated_at();

create trigger set_resume_generations_updated_at before update on public.resume_generations
for each row execute function public.set_updated_at();

create trigger set_ai_settings_updated_at before update on public.ai_settings
for each row execute function public.set_updated_at();

create trigger set_export_jobs_updated_at before update on public.export_jobs
for each row execute function public.set_updated_at();

create or replace function public.owns_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.owns_vacancy(target_vacancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vacancies v
    join public.profiles p on p.id = v.profile_id
    where v.id = target_vacancy_id
      and p.user_id = auth.uid()
  );
$$;

create or replace function public.owns_resume_generation(target_resume_generation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resume_generations rg
    join public.profiles p on p.id = rg.profile_id
    where rg.id = target_resume_generation_id
      and p.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_bullets enable row level security;
alter table public.projects enable row level security;
alter table public.project_bullets enable row level security;
alter table public.certifications enable row level security;
alter table public.vacancies enable row level security;
alter table public.vacancy_requirements enable row level security;
alter table public.resume_generations enable row level security;
alter table public.evidence_links enable row level security;
alter table public.ai_settings enable row level security;
alter table public.export_jobs enable row level security;

create policy "profiles_select_own" on public.profiles for select using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_delete_own" on public.profiles for delete using (user_id = auth.uid());

create policy "skills_select_own" on public.skills for select using (public.owns_profile(profile_id));
create policy "skills_insert_own" on public.skills for insert with check (public.owns_profile(profile_id));
create policy "skills_update_own" on public.skills for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "skills_delete_own" on public.skills for delete using (public.owns_profile(profile_id));

create policy "experiences_select_own" on public.experiences for select using (public.owns_profile(profile_id));
create policy "experiences_insert_own" on public.experiences for insert with check (public.owns_profile(profile_id));
create policy "experiences_update_own" on public.experiences for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "experiences_delete_own" on public.experiences for delete using (public.owns_profile(profile_id));

create policy "experience_bullets_select_own" on public.experience_bullets for select using (public.owns_profile(profile_id));
create policy "experience_bullets_insert_own" on public.experience_bullets for insert with check (public.owns_profile(profile_id));
create policy "experience_bullets_update_own" on public.experience_bullets for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "experience_bullets_delete_own" on public.experience_bullets for delete using (public.owns_profile(profile_id));

create policy "projects_select_own" on public.projects for select using (public.owns_profile(profile_id));
create policy "projects_insert_own" on public.projects for insert with check (public.owns_profile(profile_id));
create policy "projects_update_own" on public.projects for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "projects_delete_own" on public.projects for delete using (public.owns_profile(profile_id));

create policy "project_bullets_select_own" on public.project_bullets for select using (public.owns_profile(profile_id));
create policy "project_bullets_insert_own" on public.project_bullets for insert with check (public.owns_profile(profile_id));
create policy "project_bullets_update_own" on public.project_bullets for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "project_bullets_delete_own" on public.project_bullets for delete using (public.owns_profile(profile_id));

create policy "certifications_select_own" on public.certifications for select using (public.owns_profile(profile_id));
create policy "certifications_insert_own" on public.certifications for insert with check (public.owns_profile(profile_id));
create policy "certifications_update_own" on public.certifications for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "certifications_delete_own" on public.certifications for delete using (public.owns_profile(profile_id));

create policy "vacancies_select_own" on public.vacancies for select using (public.owns_profile(profile_id));
create policy "vacancies_insert_own" on public.vacancies for insert with check (public.owns_profile(profile_id));
create policy "vacancies_update_own" on public.vacancies for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "vacancies_delete_own" on public.vacancies for delete using (public.owns_profile(profile_id));

create policy "vacancy_requirements_select_own" on public.vacancy_requirements for select using (public.owns_vacancy(vacancy_id));
create policy "vacancy_requirements_insert_own" on public.vacancy_requirements for insert with check (public.owns_vacancy(vacancy_id));
create policy "vacancy_requirements_update_own" on public.vacancy_requirements for update using (public.owns_vacancy(vacancy_id)) with check (public.owns_vacancy(vacancy_id));
create policy "vacancy_requirements_delete_own" on public.vacancy_requirements for delete using (public.owns_vacancy(vacancy_id));

create policy "resume_generations_select_own" on public.resume_generations for select using (public.owns_profile(profile_id));
create policy "resume_generations_insert_own" on public.resume_generations for insert with check (public.owns_profile(profile_id));
create policy "resume_generations_update_own" on public.resume_generations for update using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "resume_generations_delete_own" on public.resume_generations for delete using (public.owns_profile(profile_id));

create policy "evidence_links_select_own" on public.evidence_links for select using (public.owns_resume_generation(resume_generation_id));
create policy "evidence_links_insert_own" on public.evidence_links for insert with check (public.owns_resume_generation(resume_generation_id));
create policy "evidence_links_update_own" on public.evidence_links for update using (public.owns_resume_generation(resume_generation_id)) with check (public.owns_resume_generation(resume_generation_id));
create policy "evidence_links_delete_own" on public.evidence_links for delete using (public.owns_resume_generation(resume_generation_id));

create policy "ai_settings_select_own" on public.ai_settings for select using (user_id = auth.uid());
create policy "ai_settings_insert_own" on public.ai_settings for insert with check (user_id = auth.uid());
create policy "ai_settings_update_own" on public.ai_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_settings_delete_own" on public.ai_settings for delete using (user_id = auth.uid());

create policy "export_jobs_select_own" on public.export_jobs for select using (public.owns_resume_generation(resume_generation_id));
create policy "export_jobs_insert_own" on public.export_jobs for insert with check (public.owns_resume_generation(resume_generation_id));
create policy "export_jobs_update_own" on public.export_jobs for update using (public.owns_resume_generation(resume_generation_id)) with check (public.owns_resume_generation(resume_generation_id));
create policy "export_jobs_delete_own" on public.export_jobs for delete using (public.owns_resume_generation(resume_generation_id));

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
