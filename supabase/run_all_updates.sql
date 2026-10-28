-- All recent database updates in one file:
--   1. Rejection reasons  (same as rejection_reasons.sql)
--   2. Phone push         (same as push.sql)
--   3. Admin alerts       (same as admin_alerts.sql)
--   4. Pay after approval (same as pay_after_approval.sql)
--   5. Booking alerts     (same as booking_alerts.sql)
--   6. Block deactivated  (same as block_deactivated.sql)
--   7. Document categories (same as document_categories.sql)
-- Paste everything into Supabase > SQL Editor and press Run once.
-- Safe to run more than once.

-- =====================================================================
-- 1. Rejection reasons
-- =====================================================================

alter table public.document_requests add column if not exists rejection_reason text;
alter table public.document_requests add column if not exists payment_rejection_reason text;

-- =====================================================================
-- 2. Phone push notifications
-- =====================================================================

create table if not exists public.push_subscriptions (
  endpoint text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  primary key (endpoint, user_id)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.notifications add column if not exists pushed_at timestamptz;

create extension if not exists pg_net with schema extensions;

create or replace function public.push_new_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://drayoarqzddcukilpcxk.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception
  when others then return new;
end;
$$;

revoke execute on function public.push_new_notification() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.push_new_notification();

-- =====================================================================
-- 3. Registrar/Admin alerts on new requests and payments
-- =====================================================================

create or replace function public.notify_admins_new_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
begin
  select coalesce(nullif(full_name, ''), email, 'A student') into who
  from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, title, message, link)
  select p.id,
         'info',
         'New document request',
         format('%s · %s (%s) · %s %s · ₱%s%s',
           coalesce(who, 'A student'),
           coalesce(new.document_name, 'Document'),
           new.request_code,
           coalesce(new.quantity, 1),
           case when coalesce(new.quantity, 1) = 1 then 'copy' else 'copies' end,
           to_char(coalesce(new.amount, 0), 'FM999,999,990.00'),
           case when new.urgency = 'rush' then ' · Rush' else '' end),
         '/admin/requests'
  from public.profiles p
  where p.role = 'admin' and coalesce(p.status, 'active') <> 'inactive';
  return new;
exception
  when others then return new;
end;
$$;

create or replace function public.notify_admins_new_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
  doc text;
begin
  select coalesce(nullif(full_name, ''), email, 'A student') into who
  from public.profiles where id = new.user_id;
  select format('%s (%s)', document_name, request_code) into doc
  from public.document_requests where id = new.request_id;

  insert into public.notifications (user_id, type, title, message, link)
  select p.id,
         'payment',
         'New payment to verify',
         format('%s · ₱%s via %s for %s%s',
           coalesce(who, 'A student'),
           to_char(coalesce(new.amount, 0), 'FM999,999,990.00'),
           case when new.method = 'cashier' then 'Cashier' else 'GCash' end,
           coalesce(doc, 'a request'),
           case when new.ref_no is not null then ' · Ref ' || new.ref_no else '' end),
         '/admin/payments'
  from public.profiles p
  where p.role = 'admin' and coalesce(p.status, 'active') <> 'inactive';
  return new;
exception
  when others then return new;
end;
$$;

revoke execute on function public.notify_admins_new_request() from public, anon, authenticated;
revoke execute on function public.notify_admins_new_payment() from public, anon, authenticated;

drop trigger if exists document_requests_notify_admins on public.document_requests;
create trigger document_requests_notify_admins
  after insert on public.document_requests
  for each row execute function public.notify_admins_new_request();

drop trigger if exists payments_notify_admins on public.payments;
create trigger payments_notify_admins
  after insert on public.payments
  for each row execute function public.notify_admins_new_payment();

-- =====================================================================
-- 4. Pay only after the Registrar approves the request
-- =====================================================================

create or replace function public.require_approved_before_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return new;
  end if;

  select status into current_status from public.document_requests where id = new.request_id;

  if current_status is null or current_status not in ('approved', 'processing', 'ready') then
    raise exception 'This request must be approved by the Registrar before you can pay. Please wait for the approval notification.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.require_approved_before_payment() from public, anon, authenticated;

drop trigger if exists payments_require_approval on public.payments;
create trigger payments_require_approval
  before insert on public.payments
  for each row execute function public.require_approved_before_payment();

-- =====================================================================
-- 5. Admin alert when a student books or moves a pickup
-- =====================================================================

create or replace function public.notify_admins_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
  doc text;
begin
  if tg_op = 'UPDATE' and old.date = new.date and old.time = new.time then
    return new;
  end if;

  select coalesce(nullif(new.user_name, ''), nullif(full_name, ''), email, 'A student') into who
  from public.profiles where id = new.user_id;
  select format('%s (%s)', document_name, request_code) into doc
  from public.document_requests where id = new.request_id;

  insert into public.notifications (user_id, type, title, message, link)
  select p.id,
         'schedule',
         case when tg_op = 'UPDATE' then 'Pickup rescheduled' else 'New pickup booking' end,
         format('%s · %s · %s at %s',
           coalesce(who, 'A student'),
           coalesce(doc, new.request_type, 'a request'),
           to_char(new.date, 'FMDay, FMMonth FMDD, YYYY'),
           new.time),
         '/admin/scheduling'
  from public.profiles p
  where p.role = 'admin' and coalesce(p.status, 'active') <> 'inactive';
  return new;
exception
  when others then return new;
end;
$$;

revoke execute on function public.notify_admins_new_booking() from public, anon, authenticated;

drop trigger if exists pickup_bookings_notify_admins on public.pickup_bookings;
create trigger pickup_bookings_notify_admins
  after insert or update on public.pickup_bookings
  for each row execute function public.notify_admins_new_booking();

-- =====================================================================
-- 6. Block deactivated accounts
-- =====================================================================

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

create or replace function public.block_deactivated_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'inactive'
  ) then
    raise exception 'This account has been deactivated by the Registrar. Please visit the Registrar''s Office.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.block_deactivated_user() from public, anon, authenticated;

drop trigger if exists document_requests_block_deactivated on public.document_requests;
create trigger document_requests_block_deactivated
  before insert on public.document_requests
  for each row execute function public.block_deactivated_user();

drop trigger if exists payments_block_deactivated on public.payments;
create trigger payments_block_deactivated
  before insert on public.payments
  for each row execute function public.block_deactivated_user();

drop trigger if exists pickup_bookings_block_deactivated on public.pickup_bookings;
create trigger pickup_bookings_block_deactivated
  before insert or update on public.pickup_bookings
  for each row execute function public.block_deactivated_user();

-- =====================================================================
-- 7. Document categories (minor / major)
-- =====================================================================

alter table public.documents
  add column if not exists category text not null default 'minor';

alter table public.documents
  drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_check
  check (category in ('minor', 'major'));

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
