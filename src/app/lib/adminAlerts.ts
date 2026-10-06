import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, requireSupabase } from './supabase';
import { formatPeso } from './documents';
import { playOfficeChime, unlockChime } from './officeChime';

export interface AdminAlert {
  id: string;
  kind: 'request' | 'payment';
  title: string;
  detail: string;
  link: string;
  at: number;
}

const AUTO_HIDE_MS = 15000;

async function studentName(userId: unknown) {
  if (!userId) return 'A student';
  const { data } = await requireSupabase().from('profiles').select('full_name, email').eq('id', String(userId)).maybeSingle();
  return data?.full_name || data?.email || 'A student';
}

function copies(quantity: unknown) {
  const n = Math.max(1, Number(quantity) || 1);
  return `${n} ${n === 1 ? 'copy' : 'copies'}`;
}

/** Rings the office chime and lists a pop-up whenever a student submits a request or a payment. */
export function useAdminAlerts(enabled: boolean) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  const dismiss = useCallback((id: string) => {
    setAlerts(list => list.filter(item => item.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unlock = () => unlockChime();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    const push = (alert: AdminAlert) => {
      playOfficeChime();
      setAlerts(list => [alert, ...list.filter(item => item.id !== alert.id)].slice(0, 4));
      window.setTimeout(() => setAlerts(list => list.filter(item => item.id !== alert.id)), AUTO_HIDE_MS);
    };

    const client = requireSupabase();
    const channel = client
      .channel(`pcc-admin-alerts-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'document_requests' }, async payload => {
        const row = payload.new as Record<string, unknown>;
        const who = await studentName(row.user_id);
        push({
          id: `req-${row.id}`,
          kind: 'request',
          title: 'New document request',
          detail: `${who} · ${row.document_name || 'Document'} (${row.request_code}) · ${copies(row.quantity)} · ${formatPeso(Number(row.amount))}${row.urgency === 'rush' ? ' · Rush' : ''}`,
          link: '/admin/requests',
          at: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, async payload => {
        const row = payload.new as Record<string, unknown>;
        const [who, request] = await Promise.all([
          studentName(row.user_id),
          client.from('document_requests').select('request_code, document_name').eq('id', String(row.request_id)).maybeSingle(),
        ]);
        const doc = request.data ? `${request.data.document_name} (${request.data.request_code})` : 'a request';
        push({
          id: `pay-${row.id}`,
          kind: 'payment',
          title: 'New payment to verify',
          detail: `${who} · ${formatPeso(Number(row.amount))} via ${row.method === 'cashier' ? 'Cashier' : 'GCash'} for ${doc}${row.ref_no ? ` · Ref ${row.ref_no}` : ''}`,
          link: '/admin/payments',
          at: Date.now(),
        });
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled]);

  return { alerts, dismiss };
}
