-- Required dashboard steps after this SQL:
-- 1. Authentication -> Providers -> Email -> turn Confirm email OFF -> Save
-- 2. Authentication -> URL Configuration -> Site URL http://localhost:5173
--    Redirect URLs: http://localhost:5173/** and http://localhost:5173/auth/callback
-- 3. Registrar accounts created by this script:
--    Email: registrar@pcc.edu     Password: Registrar@2026
--    Email: admin@pcc.edu         Password: AdminPCC@2026
-- 4. Optional Google: Authentication -> Providers -> Google (Client ID + Secret)
--    Google on Sign in only works if the person already registered.
--    Google walk-ins do not get an automatic student profile.

-- Run this in Supabase: SQL Editor -> New query -> Paste all -> Run
-- Safe to run more than once.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  student_id text,
  role text not null default 'student' check (role in ('student', 'alumni', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists status text;
update public.profiles set status = 'active' where status is null;
alter table public.profiles alter column status set default 'active';

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role in ('student', 'alumni'));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role in ('student', 'alumni', 'admin'));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data->>'provider', '');
  marked_registered boolean := coalesce(new.raw_user_meta_data->>'registered', '') = 'true';
  assigned_role text := coalesce(new.raw_user_meta_data->>'role', '');
begin
  -- Google/OAuth must not auto-create a student profile.
  -- Sign in with Google is only allowed after Register (or registrar seed).
  if provider = 'google' and not marked_registered and assigned_role <> 'admin' then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, student_id, role, status)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'student_id',
    case
      when assigned_role in ('student', 'alumni', 'admin') then assigned_role
      else 'student'
    end,
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

create table if not exists public.documents (
  code text primary key,
  name text not null,
  description text,
  icon text default '📄',
  fee numeric not null default 0,
  available boolean not null default true,
  sort_order int not null default 0
);

alter table public.documents enable row level security;

drop policy if exists "Anyone authenticated can read documents" on public.documents;
create policy "Anyone authenticated can read documents"
  on public.documents for select
  to authenticated
  using (true);

drop policy if exists "Admins manage documents" on public.documents;
create policy "Admins manage documents"
  on public.documents for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.documents (code, name, description, icon, fee, available, sort_order)
values
  ('tor', 'Transcript of Records', 'Official academic transcript', '📋', 150, true, 1),
  ('coe', 'Certificate of Enrollment', 'Proof of current/past enrollment', '📄', 50, true, 2),
  ('diploma', 'Diploma Copy', 'Certified copy of diploma', '🎓', 200, true, 3),
  ('goodmoral', 'Good Moral Certificate', 'Certificate of good character', '⭐', 75, true, 4)
on conflict (code) do nothing;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

alter table public.app_settings enable row level security;

drop policy if exists "Authenticated can read settings" on public.app_settings;
create policy "Authenticated can read settings"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings"
  on public.app_settings for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_settings (key, value)
values
  ('rush_fee', '100'::jsonb),
  ('schedule', jsonb_build_object(
    'dailyLimit', 50,
    'slots', jsonb_build_array(
      jsonb_build_object('id', 1, 'time', '8:00 AM', 'limit', 10),
      jsonb_build_object('id', 2, 'time', '9:00 AM', 'limit', 10),
      jsonb_build_object('id', 3, 'time', '10:00 AM', 'limit', 10),
      jsonb_build_object('id', 4, 'time', '11:00 AM', 'limit', 10),
      jsonb_build_object('id', 5, 'time', '1:00 PM', 'limit', 10),
      jsonb_build_object('id', 6, 'time', '2:00 PM', 'limit', 10),
      jsonb_build_object('id', 7, 'time', '3:00 PM', 'limit', 10),
      jsonb_build_object('id', 8, 'time', '4:00 PM', 'limit', 10)
    ),
    'dateStatuses', jsonb_build_object()
  ))
on conflict (key) do nothing;

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_code text,
  document_name text not null,
  purpose text,
  quantity int not null default 1,
  notes text,
  urgency text not null default 'regular' check (urgency in ('regular', 'rush')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'processing', 'ready', 'completed', 'rejected')),
  amount numeric not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'verified', 'rejected', 'pay_later')),
  payment_method text,
  pickup_date date,
  pickup_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_requests add column if not exists rejection_reason text;
alter table public.document_requests add column if not exists payment_rejection_reason text;

alter table public.document_requests enable row level security;

drop policy if exists "Users read own requests" on public.document_requests;
create policy "Users read own requests"
  on public.document_requests for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users insert own requests" on public.document_requests;
create policy "Users insert own requests"
  on public.document_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own requests" on public.document_requests;
create policy "Users update own requests"
  on public.document_requests for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_code text unique not null,
  request_id uuid not null references public.document_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('gcash', 'cashier')),
  amount numeric not null default 0,
  ref_no text,
  screenshot_path text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users insert own payments" on public.payments;
create policy "Users insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users and admins update payments" on public.payments;
create policy "Users and admins update payments"
  on public.payments for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create table if not exists public.pickup_bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text,
  date date not null,
  time text not null,
  request_type text,
  created_at timestamptz not null default now(),
  unique (request_id)
);

alter table public.pickup_bookings enable row level security;

drop policy if exists "Users read bookings" on public.pickup_bookings;
create policy "Users read bookings"
  on public.pickup_bookings for select
  to authenticated
  using (true);

drop policy if exists "Users insert own bookings" on public.pickup_bookings;
create policy "Users insert own bookings"
  on public.pickup_bookings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own bookings" on public.pickup_bookings;
create policy "Users update own bookings"
  on public.pickup_bookings for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users insert notifications" on public.notifications;
create policy "Users insert notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

create table if not exists public.academic_calendars (
  school_year text primary key,
  terms jsonb not null
);

alter table public.academic_calendars enable row level security;

drop policy if exists "Authenticated read calendars" on public.academic_calendars;
create policy "Authenticated read calendars"
  on public.academic_calendars for select
  to authenticated
  using (true);

drop policy if exists "Admins manage calendars" on public.academic_calendars;
create policy "Admins manage calendars"
  on public.academic_calendars for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated upload payment proofs" on storage.objects;
create policy "Authenticated upload payment proofs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'payment-proofs');

drop policy if exists "Authenticated read payment proofs" on storage.objects;
create policy "Authenticated read payment proofs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-proofs');

create index if not exists document_requests_user_id_idx on public.document_requests (user_id);
create index if not exists document_requests_created_at_idx on public.document_requests (created_at desc);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_request_id_idx on public.payments (request_id);
create index if not exists pickup_bookings_date_idx on public.pickup_bookings (date);
create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.profiles replica identity full;
alter table public.documents replica identity full;
alter table public.app_settings replica identity full;
alter table public.document_requests replica identity full;
alter table public.payments replica identity full;
alter table public.pickup_bookings replica identity full;
alter table public.notifications replica identity full;
alter table public.academic_calendars replica identity full;

create or replace function public.enable_realtime(tbl text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter publication supabase_realtime add table %I.%I', 'public', tbl);
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

revoke execute on function public.enable_realtime(text) from public, anon, authenticated;

select public.enable_realtime('profiles');
select public.enable_realtime('documents');
select public.enable_realtime('app_settings');
select public.enable_realtime('document_requests');
select public.enable_realtime('payments');
select public.enable_realtime('pickup_bookings');
select public.enable_realtime('notifications');
select public.enable_realtime('academic_calendars');

-- Built-in registrar accounts (email already confirmed)
-- Email:    registrar@pcc.edu     Password: Registrar@2026
-- Email:    admin@pcc.edu         Password: AdminPCC@2026
create schema if not exists extensions;
do $$
begin
  create extension if not exists pgcrypto with schema extensions;
exception
  when others then
    create extension if not exists pgcrypto;
end;
$$;

create or replace function public.seed_staff_user(
  staff_email text,
  staff_password text,
  staff_name text,
  staff_code text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  staff_id uuid;
  password_hash text := crypt(staff_password, gen_salt('bf'::text));
begin
  select id into staff_id from auth.users where lower(email) = lower(staff_email);

  if staff_id is null then
    staff_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      staff_id,
      'authenticated',
      'authenticated',
      staff_email,
      password_hash,
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', staff_name, 'role', 'admin'),
      now(), now(), '', '', '', ''
    );
  else
    update auth.users
    set
      encrypted_password = password_hash,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', staff_name, 'role', 'admin'),
      updated_at = now()
    where id = staff_id;
  end if;

  if not exists (select 1 from auth.identities where user_id = staff_id and provider = 'email') then
    begin
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        staff_id,
        jsonb_build_object('sub', staff_id::text, 'email', staff_email, 'email_verified', true),
        'email',
        staff_id::text,
        now(), now(), now()
      );
    exception when others then
      insert into auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        staff_id,
        jsonb_build_object('sub', staff_id::text, 'email', staff_email, 'email_verified', true),
        'email',
        now(), now(), now()
      );
    end;
  end if;

  insert into public.profiles (id, email, full_name, student_id, role, status)
  values (staff_id, staff_email, staff_name, staff_code, 'admin', 'active')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        student_id = excluded.student_id,
        role = 'admin',
        status = 'active';
end;
$$;

select public.seed_staff_user('registrar@pcc.edu', 'Registrar@2026', 'PCC Registrar', 'REG-001');
select public.seed_staff_user('admin@pcc.edu', 'AdminPCC@2026', 'PCC Registrar Admin', 'ADMIN-001');

-- Students can only pay after the Registrar approves the request.
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

-- Deactivated accounts cannot submit requests, payments, or bookings.
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
