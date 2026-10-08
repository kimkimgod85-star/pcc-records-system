-- Registrar/Admin alerts: every admin gets a notification row when a student
-- submits a request or a payment. With supabase/push.sql installed, these rows
-- are also pushed to the admin's phone. Safe to run more than once.

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

-- Pickup bookings
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
