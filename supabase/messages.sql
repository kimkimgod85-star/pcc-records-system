-- Run once in the Supabase SQL editor.
-- One conversation per student with the Registrar's Office.
-- Messages are text only, up to 1,000 characters.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  last_body text not null default '',
  last_at timestamptz,
  student_read_at timestamptz not null default now(),
  office_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

drop policy if exists "Read own or admin conversations" on public.conversations;
create policy "Read own or admin conversations"
  on public.conversations for select
  to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Start a conversation" on public.conversations;
create policy "Start a conversation"
  on public.conversations for insert
  to authenticated
  with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "Update own or admin conversations" on public.conversations;
create policy "Update own or admin conversations"
  on public.conversations for update
  to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "Delete own or admin conversations" on public.conversations;
create policy "Delete own or admin conversations"
  on public.conversations for delete
  to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Read messages in a visible conversation" on public.messages;
create policy "Read messages in a visible conversation"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Send a message" on public.messages;
create policy "Send a message"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Edit own message" on public.messages;
create policy "Edit own message"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

drop policy if exists "Delete own message" on public.messages;
create policy "Delete own message"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

create or replace function public.protect_message_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sender_id := old.sender_id;
  new.conversation_id := old.conversation_id;
  new.created_at := old.created_at;
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists messages_protect_edit on public.messages;
create trigger messages_protect_edit
  before update on public.messages
  for each row execute procedure public.protect_message_edit();

create or replace function public.refresh_conversation_preview()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := coalesce(new.conversation_id, old.conversation_id);
  latest public.messages%rowtype;
begin
  select * into latest from public.messages
  where conversation_id = cid
  order by created_at desc
  limit 1;
  update public.conversations
  set last_body = coalesce(left(latest.body, 160), ''),
      last_at = latest.created_at,
      updated_at = now()
  where id = cid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists messages_refresh_preview on public.messages;
create trigger messages_refresh_preview
  after insert or update or delete on public.messages
  for each row execute procedure public.refresh_conversation_preview();

create or replace function public.unread_message_count()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return (
      select count(*)::integer
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id = c.student_id
        and m.created_at > c.office_read_at
    );
  end if;
  return (
    select count(*)::integer
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where c.student_id = auth.uid()
      and m.sender_id <> auth.uid()
      and m.created_at > c.student_read_at
  );
end;
$$;

revoke all on function public.unread_message_count() from public;
grant execute on function public.unread_message_count() to authenticated;

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
select public.enable_realtime('conversations');
select public.enable_realtime('messages');
