import { isSupabaseConfigured, requireSupabase } from './supabase';

export function listenRealtime(tables: string[], onChange: () => void) {
  if (!isSupabaseConfigured || tables.length === 0) return () => {};
  const client = requireSupabase();
  const channel = client.channel(`pcc-${tables.join('-')}-${Math.random().toString(36).slice(2)}`);
  tables.forEach(table => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
  });
  channel.subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeLocalAndRemote(eventName: string, tables: string[], onChange: () => void) {
  window.addEventListener(eventName, onChange);
  const stopRealtime = listenRealtime(tables, onChange);
  return () => {
    window.removeEventListener(eventName, onChange);
    stopRealtime();
  };
}
