-- Document categories: Minor (about 1 working day) and Major (longer + clearance advice).
-- Safe to run more than once. Run in Supabase > SQL Editor.

alter table public.documents
  add column if not exists category text not null default 'minor';

alter table public.documents
  drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_check
  check (category in ('minor', 'major'));

-- Existing rows: mark known majors, leave the rest as minor.
update public.documents
set category = 'major'
where code in ('tor', 'diploma', 'hd', 'ctc', 'transfer', 'honorable')
   or lower(name) like '%transcript%'
   or lower(name) like '%diploma%'
   or lower(name) like '%honorable%'
   or lower(name) like '%transfer credential%';

update public.documents
set category = 'minor'
where category is distinct from 'major'
  and (
    code in ('coe', 'cor', 'cog', 'goodmoral', 'grades', 'registration', 'enrollment')
    or lower(name) like '%enrollment%'
    or lower(name) like '%registration%'
    or lower(name) like '%grade%'
    or lower(name) like '%good moral%'
  );

-- Seed / refresh the official list. Fees are defaults; edit anytime in Admin → Document Fees.
insert into public.documents (code, name, description, icon, fee, available, sort_order, category)
values
  ('coe', 'Certificate of Enrollment', 'Proof of current or past enrollment', '📄', 50, true, 1, 'minor'),
  ('cor', 'Certificate of Registration', 'Proof of subjects registered for the term', '📝', 50, true, 2, 'minor'),
  ('cog', 'Certificate of Grades', 'Certified grades for the requested term', '📊', 50, true, 3, 'minor'),
  ('goodmoral', 'Good Moral Certificate', 'Certificate of good character', '⭐', 75, true, 4, 'minor'),
  ('hd', 'Honorable Dismissal', 'Clearance to leave / transfer from the school', '🗂️', 100, true, 5, 'major'),
  ('ctc', 'Certificate of Transfer Credential', 'Credentials needed for transfer to another school', '📑', 100, true, 6, 'major'),
  ('tor', 'Transcript of Records', 'Official academic transcript', '📋', 150, true, 7, 'major'),
  ('diploma', 'Diploma', 'Certified diploma / diploma copy', '🎓', 200, true, 8, 'major')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  category = excluded.category;
  -- fee and available are left alone so admin price edits are kept
