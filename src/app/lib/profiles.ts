import { requireSupabase } from './supabase';
import { formatShortDate, tableMissing } from './status';
import { listenRealtime } from './realtime';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  studentId: string;
  role: string;
  status: 'active' | 'inactive';
  joined: string;
  requests: number;
}

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  try {
    const client = requireSupabase();
    const [{ data: profiles, error }, { data: requests }] = await Promise.all([
      client.from('profiles').select('*').order('created_at', { ascending: false }),
      client.from('document_requests').select('user_id'),
    ]);
    if (error) throw error;
    const counts = new Map<string, number>();
    (requests || []).forEach(item => {
      counts.set(item.user_id, (counts.get(item.user_id) || 0) + 1);
    });
    return (profiles || [])
      .filter(item => item.role !== 'admin')
      .map(item => ({
        id: String(item.id),
        name: String(item.full_name || item.email || 'User'),
        email: String(item.email || ''),
        studentId: String(item.student_id || ''),
        role: String(item.role || 'student'),
        status: item.status === 'inactive' ? 'inactive' : 'active',
        joined: formatShortDate(String(item.created_at || '')),
        requests: counts.get(item.id) || 0,
      }));
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return [];
  }
}

export async function setUserStatus(id: string, status: 'active' | 'inactive') {
  const client = requireSupabase();
  const { error } = await client.from('profiles').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateManagedUser(
  id: string,
  details: { name: string; studentId: string; role: 'student' | 'alumni' },
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .update({
      full_name: details.name.trim(),
      student_id: details.studentId.trim() || null,
      role: details.role,
    })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('You do not have permission to edit this user.');
}

export async function fetchProfileStatus(id: string) {
  const client = requireSupabase();
  const { data } = await client.from('profiles').select('status, role').eq('id', id).maybeSingle();
  return data;
}

export function subscribeUsers(onChange: () => void) {
  return listenRealtime(['profiles', 'document_requests'], onChange);
}
