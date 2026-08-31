-- Vocabulary items saved per student (mirrors the current vocabBank shape)
create table if not exists public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  translation text,
  gender text,
  infinitive text,
  masculine text,
  masculine_plural text,
  feminine text,
  feminine_plural text,
  example text,
  example_translation text,
  box integer not null default 0,
  next_review timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.vocab_items enable row level security;

create policy "Students can view their own vocab"
  on public.vocab_items for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Students can insert their own vocab"
  on public.vocab_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Students can update their own vocab"
  on public.vocab_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Students can delete their own vocab"
  on public.vocab_items for delete
  to authenticated
  using (auth.uid() = user_id);

-- Correction history saved per student (mirrors the current correctionsBank shape)
create table if not exists public.corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original text,
  better text not null,
  explanation text,
  created_at timestamptz not null default now()
);

alter table public.corrections enable row level security;

create policy "Students can view their own corrections"
  on public.corrections for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Students can insert their own corrections"
  on public.corrections for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Students can delete their own corrections"
  on public.corrections for delete
  to authenticated
  using (auth.uid() = user_id);

-- One row per student, tracking the vocab review streak (Leitner system)
create table if not exists public.review_streak (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count integer not null default 0,
  last_day date,
  updated_at timestamptz not null default now()
);

alter table public.review_streak enable row level security;

create policy "Students can view their own streak"
  on public.review_streak for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Students can insert their own streak"
  on public.review_streak for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Students can update their own streak"
  on public.review_streak for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
