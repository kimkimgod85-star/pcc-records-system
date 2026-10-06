import { Bell, CheckCircle, Calendar, Package, CreditCard, AlertCircle, Tag } from 'lucide-react';
import { requireSupabase } from './supabase';
import { tableMissing } from './status';
import { subscribeLocalAndRemote } from './realtime';

const EVENT = 'pcc-notifications-updated';

export type NoticeType = 'ready' | 'schedule' | 'payment' | 'approved' | 'completed' | 'info' | 'price';

export interface AppNotification {
  id: string;
  userId: string;
  type: NoticeType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export const NOTICE_ICON = {
  ready: { icon: Package, iconColor: 'text-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/30' },
  schedule: { icon: Calendar, iconColor: 'text-green-500', iconBg: 'bg-green-100 dark:bg-green-900/30' },
  payment: { icon: AlertCircle, iconColor: 'text-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/30' },
  approved: { icon: CheckCircle, iconColor: 'text-green-500', iconBg: 'bg-green-100 dark:bg-green-900/30' },
  completed: { icon: CheckCircle, iconColor: 'text-green-600', iconBg: 'bg-green-100 dark:bg-green-900/30' },
  info: { icon: Bell, iconColor: 'text-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/30' },
  price: { icon: Tag, iconColor: 'text-amber-600', iconBg: 'bg-amber-100 dark:bg-amber-900/30' },
};

export const PAYMENT_NOTICE_ICON = { icon: CreditCard, iconColor: 'text-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-900/30' };

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: (row.type as NoticeType) || 'info',
    title: String(row.title || 'Notice'),
    message: String(row.message || ''),
    link: String(row.link || '/dashboard'),
    read: Boolean(row.read),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => mapRow(row as Record<string, unknown>));
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return [];
  }
}

export async function addNotification(input: {
  userId: string;
  type: NoticeType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const client = requireSupabase();
    await client.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link || '/dashboard',
    });
    emit();
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
  }
}

export async function notifyAllStudents(input: {
  type: NoticeType;
  title: string;
  message: string;
  link?: string;
}) {
  const client = requireSupabase();
  const { data: people, error } = await client
    .from('profiles')
    .select('id')
    .in('role', ['student', 'alumni'])
    .neq('status', 'inactive');
  if (error) throw error;
  if (!people?.length) return 0;

  const rows = people.map(person => ({
    user_id: person.id,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link || '/dashboard',
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error: insertError } = await client.from('notifications').insert(rows.slice(i, i + 500));
    if (insertError) throw insertError;
  }
  emit();
  return rows.length;
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  try {
    const client = requireSupabase();
    const { count, error } = await client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
    return count || 0;
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return 0;
  }
}

export async function markNotificationRead(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
  emit();
}

export async function markAllNotificationsRead(userId: string) {
  const client = requireSupabase();
  const { error } = await client.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw error;
  emit();
}

export async function dismissNotification(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('notifications').delete().eq('id', id);
  if (error) throw error;
  emit();
}

export function subscribeNotifications(onChange: () => void) {
  return subscribeLocalAndRemote(EVENT, ['notifications'], onChange);
}
