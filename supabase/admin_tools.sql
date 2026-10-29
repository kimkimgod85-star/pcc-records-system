-- Run once in the Supabase SQL editor.
-- Lets an admin delete a student or alumni login, and wipe request records.
-- Accounts, document fees, and the pickup schedule are kept by the reset.

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete accounts.';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target and role in ('student', 'alumni')
  ) then
    raise exception 'Only student and alumni accounts can be deleted here.';
  end if;

  -- Removes the login. Profiles, requests, payments, bookings and
  -- notifications for this person are removed by the existing links.
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

create or replace function public.admin_reset_records()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reset records.';
  end if;

  delete from public.notifications;
  delete from public.document_requests;

  begin
    delete from storage.objects where bucket_id = 'payment-proofs';
  exception when others then
    null;
  end;
end;
$$;

revoke all on function public.admin_reset_records() from public;
grant execute on function public.admin_reset_records() to authenticated;
