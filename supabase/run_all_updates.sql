-- All recent database updates in one file:
--   1. Rejection reasons  (same as rejection_reasons.sql)
--   2. Phone push         (same as push.sql)
--   3. Admin alerts       (same as admin_alerts.sql)
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
