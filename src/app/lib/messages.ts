import { useEffect, useState } from 'react';
import { requireSupabase } from './supabase';
import { subscribeLocalAndRemote } from './realtime';

const EVENT = 'pcc-messages-updated';
export const MESSAGE_LIMIT = 1000;

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
}

export interface InboxThread {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  lastBody: string;
  lastAt: string | null;
  officeReadAt: string;
  avatarUrl: string | null;
}

function explain(error: { message?: string; code?: string } | null, fallback: string) {
  const message = error?.message || fallback;
  if (error?.code === 'PGRST202' || error?.code === '42P01' || /could not find|schema cache|does not exist/i.test(message)) {
    return 'Messages are not set up yet. Open the Supabase SQL editor and run supabase/messages.sql once, then try again.';
  }
  return message;
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body || ''),
    editedAt: row.edited_at ? String(row.edited_at) : null,
    createdAt: String(row.created_at),
  };
}

export function subscribeMessages(onChange: () => void) {
  return subscribeLocalAndRemote(EVENT, ['messages', 'conversations'], onChange);
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function useUnreadMessages(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    const load = () => { void fetchUnreadCount().then(setCount); };
    load();
    const timer = window.setInterval(load, 30000);
    const stop = subscribeMessages(load);
    return () => { window.clearInterval(timer); stop(); };
  }, [enabled]);
  return count;
}

export async function fetchUnreadCount() {
  try {
    const { data, error } = await requireSupabase().rpc('unread_message_count');
    if (error) return 0;
    return Number(data) || 0;
  } catch {
    return 0;
  }
}

export async function fetchInbox(): Promise<InboxThread[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('conversations')
    .select('id, student_id, last_body, last_at, office_read_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(explain(error, 'Could not load messages.'));
  const ids = (data || []).map(row => String(row.student_id));
  let profiles: { id: string; full_name?: string | null; email?: string | null; avatar_url?: string | null }[] = [];
  if (ids.length) {
    const withPhoto = await client.from('profiles').select('id, full_name, email, avatar_url').in('id', ids);
    if (withPhoto.error) {
      const plain = await client.from('profiles').select('id, full_name, email').in('id', ids);
      profiles = plain.data || [];
    } else {
      profiles = withPhoto.data || [];
    }
  }
  const names = new Map(profiles.map(profile => [String(profile.id), profile]));
  return (data || []).map(row => {
    const profile = names.get(String(row.student_id));
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: profile?.full_name || 'Student',
      studentEmail: profile?.email || '',
      lastBody: String(row.last_body || ''),
      lastAt: row.last_at ? String(row.last_at) : null,
      officeReadAt: String(row.office_read_at),
      avatarUrl: profile?.avatar_url || null,
    };
  });
}

export async function openStudentThread(studentId: string) {
  const client = requireSupabase();
  const { data: existing, error: readError } = await client
    .from('conversations')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();
  if (readError) throw new Error(explain(readError, 'Could not open the conversation.'));
  if (existing) return String(existing.id);
  const { data, error } = await client
    .from('conversations')
    .insert({ student_id: studentId })
    .select('id')
    .single();
  if (error) throw new Error(explain(error, 'Could not start the conversation.'));
  emit();
  return String(data.id);
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(explain(error, 'Could not load messages.'));
  return (data || []).map(row => mapMessage(row as Record<string, unknown>));
}

export async function markThreadRead(conversationId: string, asAdmin: boolean) {
  const patch = asAdmin
    ? { office_read_at: new Date().toISOString() }
    : { student_read_at: new Date().toISOString() };
  await requireSupabase().from('conversations').update(patch).eq('id', conversationId);
  emit();
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const text = body.trim();
  if (!text) return;
  if (text.length > MESSAGE_LIMIT) throw new Error(`Keep the message under ${MESSAGE_LIMIT} characters.`);
  const { error } = await requireSupabase().from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body: text,
  });
  if (error) throw new Error(explain(error, 'Could not send the message.'));
  emit();
}

export async function editMessage(id: string, body: string) {
  const text = body.trim();
  if (!text) throw new Error('A message cannot be empty.');
  if (text.length > MESSAGE_LIMIT) throw new Error(`Keep the message under ${MESSAGE_LIMIT} characters.`);
  const { error } = await requireSupabase().from('messages').update({ body: text }).eq('id', id);
  if (error) throw new Error(explain(error, 'Could not edit the message.'));
  emit();
}

export async function deleteMessage(id: string) {
  const { error } = await requireSupabase().from('messages').delete().eq('id', id);
  if (error) throw new Error(explain(error, 'Could not delete the message.'));
  emit();
}

export async function deleteConversation(id: string) {
  const { error } = await requireSupabase().from('conversations').delete().eq('id', id);
  if (error) throw new Error(explain(error, 'Could not delete the conversation.'));
  emit();
}
