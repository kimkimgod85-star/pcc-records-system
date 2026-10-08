-- Registrar/Admin alert when a student books or moves a pickup date.
-- With supabase/push.sql installed, it is also pushed to the admin's phone.
-- Run once in Supabase > SQL Editor. Safe to run more than once.

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
