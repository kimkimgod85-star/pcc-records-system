-- Web Push: lets phones get notifications even when the site is closed.
-- Run this once in Supabase > SQL Editor, after deploying the send-push Edge Function.

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
