-- Afrakomah HMS relational schema. Run once in Supabase SQL Editor.
-- Staff authenticate by staff_id; email is not required.
create extension if not exists pgcrypto;
drop table if exists public.hms_records;
drop table if exists public.hms_state;

do $$ declare t text; begin
  foreach t in array array['staff','patients','wards','beds','appointments','vitals','consultations','patient_documents','patient_comments','lab_tests','lab_orders','lab_results','medicines','prescriptions','prescription_items','admissions','maternity_records','nursing_notes','invoices','invoice_items','payments','notifications','audit_logs'] loop execute format('drop table if exists public.%I cascade', t); end loop;
end $$;

drop type if exists public.staff_role cascade;
drop type if exists public.patient_status cascade;
drop type if exists public.invoice_status cascade;
drop type if exists public.lab_status cascade;
create type public.staff_role as enum ('admin','doctor','nurse','reception','lab','pharmacist','billing');
create type public.patient_status as enum ('outpatient','admitted','emergency','discharged');
create type public.invoice_status as enum ('unpaid','partial','paid');
create type public.lab_status as enum ('ordered','collected','processing','results','verified');

create table public.staff (id uuid primary key default gen_random_uuid(), staff_id text not null unique, full_name text not null, password_hash text not null, role public.staff_role not null, department text not null, job_title text not null default '', phone text not null default '', active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.patients (id uuid primary key default gen_random_uuid(), mrn text not null unique, national_id text not null default '', full_name text not null, date_of_birth date not null, gender text not null check (gender in ('Male','Female')), phone text not null default '', address text not null default '', blood_group text not null default '', allergies text[] not null default '{}', insurance jsonb, next_of_kin jsonb not null default '{}', history text[] not null default '{}', medications text[] not null default '{}', status public.patient_status not null default 'outpatient', financially_cleared_at timestamptz, financially_cleared_by uuid references public.staff(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.wards (id uuid primary key default gen_random_uuid(), ward_code text not null unique, name text not null, nightly_charge numeric(12,2) not null default 0 check (nightly_charge >= 0), active boolean not null default true);
create table public.beds (id uuid primary key default gen_random_uuid(), bed_code text not null unique, ward_id uuid not null references public.wards(id), status text not null default 'available' check (status in ('available','occupied','cleaning','reserved')), patient_id uuid references public.patients(id));
create table public.appointments (id uuid primary key default gen_random_uuid(), external_id text not null unique, patient_id uuid not null references public.patients(id), doctor_id uuid not null references public.staff(id), appointment_date date not null, appointment_time time not null, appointment_type text not null default 'General', reason text not null default '', status text not null default 'scheduled', created_at timestamptz not null default now());
create table public.vitals (id uuid primary key default gen_random_uuid(), external_id text not null unique, patient_id uuid not null references public.patients(id), recorded_by uuid not null references public.staff(id), temperature numeric(5,2), bp_systolic integer, bp_diastolic integer, pulse integer, respiration integer, spo2 integer, weight numeric(6,2), height numeric(6,2), recorded_at timestamptz not null default now());
create table public.consultations (id uuid primary key default gen_random_uuid(), external_id text not null unique, patient_id uuid not null references public.patients(id), doctor_id uuid not null references public.staff(id), complaint text not null, symptoms text[] not null default '{}', vitals jsonb not null default '{}', examination text not null default '', diagnosis text not null, treatment text not null default '', notes text not null default '', follow_up_date date, rx_id text, lab_ids text[] not null default '{}', created_at timestamptz not null default now());
create table public.patient_documents (id uuid primary key default gen_random_uuid(), external_id text not null unique, patient_id uuid not null references public.patients(id) on delete cascade, file_name text not null, file_size integer not null default 0, data_url text not null, uploaded_at timestamptz not null default now(), uploaded_by uuid not null references public.staff(id), department text not null default '');
create table public.patient_comments (id uuid primary key default gen_random_uuid(), external_id text not null unique, patient_id uuid not null references public.patients(id) on delete cascade, comment text not null, created_at timestamptz not null default now(), created_by uuid not null references public.staff(id), role public.staff_role not null, department text not null default '');
create table public.lab_tests (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, category text not null, actual_price numeric(12,2) not null default 0, nhis_price numeric(12,2), markers jsonb not null default '[]');
create table public.lab_orders (id uuid primary key default gen_random_uuid(), order_no text not null unique, patient_id uuid not null references public.patients(id), doctor_id uuid not null references public.staff(id), test_id uuid not null references public.lab_tests(id), priority text not null default 'routine', status public.lab_status not null default 'ordered', note text not null default '', ordered_at timestamptz not null default now(), verified_by uuid references public.staff(id), verified_at timestamptz);
create table public.lab_results (id uuid primary key default gen_random_uuid(), external_id text not null unique, lab_order_id uuid not null references public.lab_orders(id) on delete cascade, marker text not null, value text not null, unit text not null default '', reference_range text not null default '', flag text not null default '-');
create table public.medicines (id uuid primary key default gen_random_uuid(), medicine_code text not null unique, name text not null, category text not null, batch_number text not null default '', supplier text not null default '', stock integer not null default 0 check (stock >= 0), unit text not null default 'units', buy_price numeric(12,2) not null default 0, sell_price numeric(12,2) not null default 0, expiry_date date, reorder_level integer not null default 0, storage_location text not null default '', active boolean not null default true);
create table public.prescriptions (id uuid primary key default gen_random_uuid(), prescription_no text not null unique, patient_id uuid not null references public.patients(id), doctor_id uuid not null references public.staff(id), status text not null default 'pending' check (status in ('pending','dispensed')), prescribed_at timestamptz not null default now(), dispensed_by uuid references public.staff(id), dispensed_at timestamptz);
create table public.prescription_items (id uuid primary key default gen_random_uuid(), prescription_id uuid not null references public.prescriptions(id) on delete cascade, medicine_id uuid references public.medicines(id), medicine_name text not null, quantity integer not null check (quantity > 0), dose text not null default '', frequency text not null default '', duration text not null default '', unit_price numeric(12,2) not null default 0);
create table public.admissions (id uuid primary key default gen_random_uuid(), admission_no text not null unique, patient_id uuid not null references public.patients(id), bed_id uuid not null references public.beds(id), admitting_doctor_id uuid references public.staff(id), diagnosis text not null, status text not null default 'active' check (status in ('active','discharged')), admitted_at timestamptz not null default now(), discharged_at timestamptz, daily_charge numeric(12,2) not null default 0);
create table public.maternity_records (id uuid primary key default gen_random_uuid(), record_no text not null unique, mother_id uuid not null references public.patients(id), gravida text not null default '', parity text not null default '', lmp date, edd date, anc_investigations jsonb not null default '{}', delivery_date date, delivery_outcome text not null default '', delivery_mode text not null default '', maternal_condition text not null default '', maternal_discharge_date date, breastfeeding_started text not null default '', postpartum_notes text not null default '', baby_sex text not null default '', number_of_babies integer not null default 1, birth_weight numeric(6,2), length_cm numeric(6,2), head_circumference_cm numeric(6,2), apgar_one integer, apgar_five integer, resuscitation text not null default '', complications text not null default '', immunizations jsonb not null default '{}', baby_condition_at_discharge text not null default '', created_at timestamptz not null default now());
create table public.nursing_notes (id uuid primary key default gen_random_uuid(), external_id text not null unique, patient_id uuid not null references public.patients(id), admission_id uuid references public.admissions(id), written_by uuid not null references public.staff(id), note text not null, created_at timestamptz not null default now());
create table public.invoices (id uuid primary key default gen_random_uuid(), invoice_no text not null unique, patient_id uuid not null references public.patients(id), total numeric(12,2) not null default 0, paid numeric(12,2) not null default 0, status public.invoice_status not null default 'unpaid', created_at timestamptz not null default now());
create table public.invoice_items (id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade, description text not null, amount numeric(12,2) not null, item_type text not null);
create table public.payments (id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id), amount numeric(12,2) not null check (amount > 0), method text not null, received_by uuid not null references public.staff(id), paid_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), external_id text not null unique, recipient_roles public.staff_role[] not null default '{}', recipient_staff_id uuid references public.staff(id), icon text not null default 'alert', message text not null, read_at timestamptz, created_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), external_id text not null unique, actor_id uuid references public.staff(id), action text not null, entity_type text not null default '', entity_id uuid, created_at timestamptz not null default now());

create index patients_mrn_idx on public.patients(mrn); create index patients_phone_idx on public.patients(phone); create index lab_orders_patient_idx on public.lab_orders(patient_id,status); create index prescriptions_patient_idx on public.prescriptions(patient_id,status); create index invoices_patient_idx on public.invoices(patient_id,status); create index audit_logs_created_idx on public.audit_logs(created_at desc);

do $$ declare t text; begin foreach t in array array['staff','patients','wards','beds','appointments','vitals','consultations','patient_documents','patient_comments','lab_tests','lab_orders','lab_results','medicines','prescriptions','prescription_items','admissions','maternity_records','nursing_notes','invoices','invoice_items','payments','notifications','audit_logs'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy "development access %s" on public.%I for all to anon using (true) with check (true)',t,t); end loop; end $$;
grant select, insert, update, delete on all tables in schema public to anon;
insert into public.staff (staff_id,full_name,password_hash,role,department,job_title) values ('ADM-001','System Administrator',extensions.crypt('1234',extensions.gen_salt('bf')),'admin','Administration','Administrator');

create or replace function public.verify_staff_login(p_staff_id text, p_password text)
returns table(id uuid, staff_id text, full_name text, role public.staff_role, department text, job_title text, phone text, active boolean)
language sql security definer set search_path = public
as $$
  select s.id, s.staff_id, s.full_name, s.role, s.department, s.job_title, s.phone, s.active
  from public.staff s
  where s.staff_id = p_staff_id and s.active and s.password_hash = extensions.crypt(p_password, s.password_hash)
$$;
grant execute on function public.verify_staff_login(text, text) to anon;

create or replace function public.create_staff_account(p_staff_id text, p_full_name text, p_password text, p_role public.staff_role, p_department text, p_job_title text, p_phone text)
returns table(id uuid, staff_id text, full_name text, role public.staff_role, department text, job_title text, phone text, active boolean)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  insert into public.staff (staff_id, full_name, password_hash, role, department, job_title, phone)
  values (p_staff_id, p_full_name, extensions.crypt(p_password, extensions.gen_salt('bf')), p_role, p_department, p_job_title, p_phone)
  returning staff.id, staff.staff_id, staff.full_name, staff.role, staff.department, staff.job_title, staff.phone, staff.active;
end;
$$;
grant execute on function public.create_staff_account(text, text, text, public.staff_role, text, text, text) to anon;
