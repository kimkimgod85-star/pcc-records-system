-- Students can only submit a payment after the Registrar approves the request,
-- so nobody pays for a request that later gets rejected.
-- Run once in Supabase > SQL Editor. Safe to run more than once.

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
