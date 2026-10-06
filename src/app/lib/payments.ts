import { requireSupabase } from './supabase';
import { addNotification } from './notifications';
import { formatPeso } from './documents';
import { formatShortDate, tableMissing } from './status';
import { updateRequest } from './requests';
import { listenRealtime } from './realtime';

const EVENT = 'pcc-payments-updated';

export interface PaymentRecord {
  uuid: string;
  id: string;
  requestUuid: string;
  reqId: string;
  userId: string;
  student: string;
  document: string;
  method: 'gcash' | 'cashier';
  amountValue: number;
  amount: string;
  date: string;
  status: 'pending' | 'verified' | 'rejected';
  refNo: string;
  screenshotPath: string;
}

function mapRow(row: Record<string, unknown>): PaymentRecord {
  const request = (row.document_requests as Record<string, unknown> | null) || {};
  const profile = (request.profiles as { full_name?: string } | null) || (row.profiles as { full_name?: string } | null);
  const amountValue = Number(row.amount || 0);
  return {
    uuid: String(row.id),
    id: String(row.payment_code),
    requestUuid: String(row.request_id),
    reqId: String(request.request_code || ''),
    userId: String(row.user_id),
    student: profile?.full_name || 'Student',
    document: String(request.document_name || 'Document'),
    method: row.method === 'cashier' ? 'cashier' : 'gcash',
    amountValue,
    amount: formatPeso(amountValue),
    date: formatShortDate(String(row.created_at || '')),
    status: row.status === 'verified' || row.status === 'rejected' ? row.status : 'pending',
    refNo: String(row.ref_no || 'N/A'),
    screenshotPath: String(row.screenshot_path || ''),
  };
}

function makeCode() {
  return `PAY-${Date.now().toString(36).toUpperCase()}`;
}

export async function fetchPayments(userId?: string): Promise<PaymentRecord[]> {
  try {
    const client = requireSupabase();
    let query = client
      .from('payments')
      .select('*, document_requests(request_code, document_name, user_id, profiles(full_name))')
      .order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => mapRow(row as Record<string, unknown>));
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return [];
  }
}

export async function submitPayment(input: {
  requestUuid: string;
  userId: string;
  method: 'gcash' | 'cashier';
  amount: number;
  refNo?: string;
  screenshot?: File | null;
}) {
  const client = requireSupabase();
  let screenshotPath = '';
  if (input.screenshot) {
    const ext = input.screenshot.name.split('.').pop() || 'jpg';
    const path = `${input.userId}/${input.requestUuid}-${Date.now()}.${ext}`;
    const { error: uploadError } = await client.storage.from('payment-proofs').upload(path, input.screenshot, {
      upsert: true,
      contentType: input.screenshot.type || undefined,
    });
    if (uploadError) {
      throw new Error(`Could not upload the photo: ${uploadError.message}`);
    }
    const { data } = client.storage.from('payment-proofs').getPublicUrl(path);
    screenshotPath = data.publicUrl;
  }

  const { data, error } = await client
    .from('payments')
    .insert({
      payment_code: makeCode(),
      request_id: input.requestUuid,
      user_id: input.userId,
      method: input.method,
      amount: input.amount,
      ref_no: input.refNo || null,
      screenshot_path: screenshotPath || null,
      status: 'pending',
    })
    .select('*, document_requests(request_code, document_name, user_id, profiles(full_name))')
    .single();
  if (error || !data) throw error || new Error('Could not save payment.');

  await updateRequest(input.requestUuid, {
    payment_status: 'pending',
    payment_method: input.method,
  });

  await addNotification({
    userId: input.userId,
    type: 'payment',
    title: input.method === 'gcash' ? 'GCash payment submitted' : 'Cashier receipt submitted',
    message: input.method === 'gcash'
      ? 'Your payment was sent for registrar verification.'
      : 'Your official receipt was sent for registrar verification.',
    link: '/track',
  });

  window.dispatchEvent(new Event(EVENT));
  return mapRow(data as Record<string, unknown>);
}

export async function updatePaymentStatus(uuid: string, status: 'pending' | 'verified' | 'rejected', requestUuid: string, userId: string) {
  const client = requireSupabase();
  const { error } = await client.from('payments').update({ status }).eq('id', uuid);
  if (error) throw error;

  await updateRequest(requestUuid, {
    payment_status: status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending',
  });

  await addNotification({
    userId,
    type: status === 'verified' ? 'approved' : 'payment',
    title: status === 'verified' ? 'Payment verified' : status === 'rejected' ? 'Payment rejected' : 'Payment pending',
    message: status === 'verified'
      ? 'Your payment was verified. Processing can continue.'
      : status === 'rejected'
      ? 'Your payment proof was rejected. Please submit again.'
      : 'Your payment is waiting for verification.',
    link: '/payment',
  });
  window.dispatchEvent(new Event(EVENT));
}

export function screenshotUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return '';
}

export function subscribePayments(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  const stop = listenRealtime(['payments', 'document_requests'], onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    stop();
  };
}
