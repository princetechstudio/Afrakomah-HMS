-- Run once in Supabase SQL Editor for an existing deployment.
create table if not exists public.treatment_entries (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  medicine text not null,
  dose text not null default '',
  route text not null default '',
  frequency text not null default '',
  times text[] not null default '{}',
  treatment_date date not null,
  instructions text not null default '',
  administrations jsonb not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid not null references public.staff(id)
);
create index if not exists treatment_entries_patient_idx on public.treatment_entries(patient_id, treatment_date desc);
alter table public.treatment_entries enable row level security;
drop policy if exists "development access treatment_entries" on public.treatment_entries;
create policy "development access treatment_entries" on public.treatment_entries for all to anon using (true) with check (true);
grant select, insert, update, delete on public.treatment_entries to anon;
