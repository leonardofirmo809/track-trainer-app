-- Phase 2A: Add company/tenant ownership to students without changing existing flows.

alter table public.students
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_students_company_id
  on public.students(company_id);

create index if not exists idx_students_company_coach_id
  on public.students(company_id, coach_id);

comment on column public.students.company_id is
  'Company/tenant that owns the student. Nullable during multitenant migration; coach_id remains for backwards compatibility.';