-- Deactivated accounts (blocked by the Registrar/Admin):
--   * cannot reactivate themselves or change their role,
--   * cannot submit requests, payments, or pickup bookings.
-- Run once in Supabase > SQL Editor. Safe to run more than once.

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
