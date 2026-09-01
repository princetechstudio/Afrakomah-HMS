-- Incremental migration for patient attachments and department comments.
-- Run this once in the Supabase SQL Editor on an existing Afrakomah HMS database.

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  file_name text not null,
  file_size integer not null default 0,
  data_url text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid not null references public.staff(id),
  department text not null default ''
);

create table if not exists public.patient_comments (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.staff(id),
  role public.staff_role not null,
  department text not null default ''
);

create index if not exists patient_documents_patient_idx on public.patient_documents(patient_id, uploaded_at desc);
create index if not exists patient_comments_patient_idx on public.patient_comments(patient_id, created_at desc);

alter table public.patient_documents enable row level security;
alter table public.patient_comments enable row level security;

drop policy if exists "development access patient_documents" on public.patient_documents;
drop policy if exists "development access patient_comments" on public.patient_comments;
create policy "development access patient_documents" on public.patient_documents for all to anon using (true) with check (true);
create policy "development access patient_comments" on public.patient_comments for all to anon using (true) with check (true);

grant select, insert, update, delete on public.patient_documents, public.patient_comments to anon;
