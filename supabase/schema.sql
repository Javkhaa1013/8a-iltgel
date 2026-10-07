-- Апп анх асахдаа POSTGRES_URL-ээр автоматаар ажиллуулдаг (lib/schema.ts).
-- Гараар үүсгэх бол Supabase → SQL Editor дээр ажиллуулна.
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  login_code text not null unique,
  attendance_score numeric,
  bonus_score numeric,
  bonus_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  stage_id text not null,
  title text not null default '',
  body text not null default '',
  images jsonb not null default '[]',
  paste_chars integer not null default 0,
  teacher_score numeric,
  published boolean not null default false,
  view_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, stage_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_role text not null,             -- teacher | self | peer
  author_student_id uuid references public.students(id) on delete cascade,
  start_offset integer,
  end_offset integer,
  quote text not null default '',
  body text not null default '',
  score numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.extensions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  stage_id text not null,
  until timestamptz not null,
  created_at timestamptz not null default now(),
  unique (student_id, stage_id)
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  stage_id text not null,
  title text not null default '',
  body text not null default '',
  images jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, stage_id)
);

create table if not exists public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  version_no integer not null,
  title text not null default '',
  body text not null default '',
  images jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (submission_id, version_no)
);

alter table public.comments add column if not exists version_no integer;
alter table public.submissions add column if not exists author_display text not null default 'short'; -- нийтлэл дээрх нэр: short | full | anon
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_student_id uuid not null references public.students(id) on delete cascade,
  role text not null,                    -- self | peer
  ratings jsonb not null default '{}',   -- шалгуур бүрийн 1-4 үнэлгээ
  strength text not null default '',
  suggestion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, reviewer_student_id, role)
);

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists reviews_submission_idx on public.reviews (submission_id);
create index if not exists versions_submission_idx on public.submission_versions (submission_id);
create index if not exists submissions_student_idx on public.submissions (student_id);
create index if not exists comments_submission_idx on public.comments (submission_id);

alter table public.students enable row level security;
alter table public.submissions enable row level security;
alter table public.comments enable row level security;
alter table public.extensions enable row level security;
alter table public.settings enable row level security;
alter table public.drafts enable row level security;
alter table public.submission_versions enable row level security;
alter table public.reviews enable row level security;
alter table public.rate_limits enable row level security;
notify pgrst, 'reload schema';
