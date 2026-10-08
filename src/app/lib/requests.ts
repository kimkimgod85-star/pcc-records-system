import { requireSupabase } from './supabase';
import type { ProcessingUrgency } from './scheduling';
import { addNotification } from './notifications';
import { subscribeLocalAndRemote } from './realtime';
import { formatPeso } from './documents';
import {
  formatLongDate,
  isPaymentStatus,
  isRequestStatus,
  tableMissing,
  type PaymentStatus,
  type RequestStatus,
} from './status';

const EVENT = 'pcc-requests-updated';

export function trackLink(code: string) {
  return `/track?request=${encodeURIComponent(code)}`;
}

function copies(quantity: number) {
  return `${quantity} ${quantity === 1 ? 'copy' : 'copies'}`;
}

export interface StudentRequest {
  uuid: string;
  id: string;
  type: string;
  documentCode: string;
  status: RequestStatus;
  statusLabel: string;
  urgency: ProcessingUrgency;
  userId: string;
  studentName: string;
  studentId: string;
  purpose: string;
  quantity: number;
  notes: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  pickupDate: string | null;
  pickupTime: string | null;
  rejectionReason: string;
  paymentRejectionReason: string;
  createdAt: string;
  updatedAt: string;
}

type ProfileJoin = { full_name?: string | null; student_id?: string | null; email?: string | null } | null;

function isUrgency(value: unknown): value is ProcessingUrgency {
  return value === 'regular' || value === 'rush';
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

function mapRow(row: Record<string, unknown>): StudentRequest {
  const profile = (row.profiles as ProfileJoin) || null;
  const status = isRequestStatus(row.status) ? row.status : 'pending';
  const paymentStatus = isPaymentStatus(row.payment_status) ? row.payment_status : 'unpaid';
  return {
    uuid: String(row.id),
    id: String(row.request_code),
    type: String(row.document_name || 'Document Request'),
    documentCode: String(row.document_code || ''),
    status,
    statusLabel: status,
    urgency: isUrgency(row.urgency) ? row.urgency : 'regular',
    userId: String(row.user_id),
    studentName: profile?.full_name || String(row.student_name || 'Student'),
    studentId: profile?.student_id || '',
    purpose: String(row.purpose || ''),
    quantity: Number(row.quantity || 1),
    notes: String(row.notes || ''),
    amount: Number(row.amount || 0),
    paymentStatus,
    paymentMethod: String(row.payment_method || ''),
    pickupDate: row.pickup_date ? String(row.pickup_date).slice(0, 10) : null,
    pickupTime: row.pickup_time ? String(row.pickup_time) : null,
    rejectionReason: String(row.rejection_reason || ''),
    paymentRejectionReason: String(row.payment_rejection_reason || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

const SELECT = '*, profiles(full_name, student_id, email)';

async function makeRequestCode() {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).toUpperCase().slice(-5);
  return `REQ-${year}-${suffix}`;
}

export async function fetchRequests(userId?: string): Promise<StudentRequest[]> {
  try {
    const client = requireSupabase();
    let query = client.from('document_requests').select(SELECT).order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => mapRow(row as Record<string, unknown>));
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return [];
  }
}

export async function createRequest(input: {
  userId: string;
  type: string;
  documentCode: string;
  purpose: string;
  quantity: number;
  notes: string;
  urgency: ProcessingUrgency;
  amount: number;
}): Promise<StudentRequest> {
  const client = requireSupabase();
  const payload = {
    request_code: await makeRequestCode(),
    user_id: input.userId,
    document_code: input.documentCode,
    document_name: input.type,
    purpose: input.purpose,
    quantity: input.quantity,
    notes: input.notes,
    urgency: input.urgency,
    status: 'pending',
    amount: input.amount,
    payment_status: 'unpaid',
  };
  const { data, error } = await client.from('document_requests').insert(payload).select(SELECT).single();
  if (error || !data) throw error || new Error('Could not save request.');
  const created = mapRow(data as Record<string, unknown>);
  await addNotification({
    userId: input.userId,
    type: 'approved',
    title: 'Request submitted',
    message: `${created.type} (${created.id}) · ${copies(created.quantity)} · ${formatPeso(created.amount)}${created.urgency === 'rush' ? ' · Rush' : ''}. The Registrar will review it within 1–2 business days. Don’t pay yet — you’ll be notified when it is approved and ready for payment.`,
    link: trackLink(created.id),
  });
  emit();
  return created;
}

export async function updateRequest(uuid: string, patch: Record<string, unknown>) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('document_requests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', uuid)
    .select(SELECT)
    .single();
  if (error || !data) throw error || new Error('Could not update request.');
  emit();
  return mapRow(data as Record<string, unknown>);
}

function missingColumn(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : '';
  return code === 'PGRST204' || code === '42703' || /column .* does not exist|could not find the .* column/i.test(message);
}

/** Saves the request plus optional extra columns; if supabase/rejection_reasons.sql was not run yet, saves without them. */
export async function updateRequestWithOptional(uuid: string, patch: Record<string, unknown>, optional: Record<string, unknown>) {
  try {
    return await updateRequest(uuid, { ...patch, ...optional });
  } catch (error) {
    if (!missingColumn(error)) throw error;
    return updateRequest(uuid, patch);
  }
}

/** Reason and optional message joined the way students see them. */
export function composeReason(reason: string, message?: string) {
  const r = reason.trim();
  const m = (message || '').trim();
  return [r, m].filter(Boolean).join(' — ');
}

export async function updateRequestStatus(uuid: string, status: RequestStatus, userId?: string, type?: string, code?: string, reason = '') {
  const updated = await updateRequestWithOptional(uuid, { status }, { rejection_reason: status === 'rejected' ? reason || null : null });
  if (userId) {
    const doc = `${updated.type || type || 'Your document'} (${updated.id || code})`;
    const paymentNote =
      updated.paymentStatus === 'verified' ? ' Your payment is already verified, so there is nothing else to pay.'
      : updated.paymentStatus === 'pending' ? ' Your payment was received and is waiting for verification.'
      : updated.paymentStatus === 'pay_later' ? ''
      : ` You can now pay ${formatPeso(updated.amount)} so it can be processed.`;
    const needsPayment = status === 'approved' && (updated.paymentStatus === 'unpaid' || updated.paymentStatus === 'rejected');
    const pickup = updated.pickupDate
      ? ` Pickup: ${formatLongDate(updated.pickupDate)}${updated.pickupTime ? ` at ${updated.pickupTime}` : ''}. Bring a valid ID.`
      : ' Schedule your pickup to claim it. Bring a valid ID.';
    const notices: Record<RequestStatus, { title: string; message: string }> = {
      pending: { title: 'Request back under review', message: `${doc} is being reviewed again by the Registrar.` },
      approved: { title: 'Request approved', message: `${doc} was approved.${paymentNote}` },
      processing: { title: 'Document is being prepared', message: `${doc} is now being prepared by the Registrar.` },
      ready: { title: 'Ready for pickup', message: `${doc} is ready at the Registrar’s Office.${pickup}` },
      completed: { title: 'Request completed', message: `${doc} was claimed. Thank you!` },
      rejected: {
        title: 'Request rejected',
        message: reason
          ? `${doc} was not approved. Reason: ${reason}`
          : `${doc} was not approved. Please contact the Registrar’s Office for details.`,
      },
    };
    await addNotification({
      userId,
      type: status === 'rejected' ? 'payment' : status === 'ready' ? 'ready' : status === 'completed' ? 'completed' : 'approved',
      title: notices[status].title,
      message: notices[status].message,
      link: needsPayment ? `/payment?request=${encodeURIComponent(updated.id)}`
        : status === 'ready' && !updated.pickupDate ? `/schedule?request=${encodeURIComponent(updated.id)}`
        : trackLink(updated.id),
    });
  }
  return updated;
}

export function subscribeRequests(onChange: () => void) {
  return subscribeLocalAndRemote(EVENT, ['document_requests'], onChange);
}

export function getBookableRequests(requests: StudentRequest[], userId?: string) {
  return requests.filter(item => item.status !== 'completed' && item.status !== 'rejected' && (!userId || item.userId === userId));
}

export async function loadStudentRequests(): Promise<StudentRequest[]> {
  return fetchRequests();
}

export async function saveStudentRequest(input: {
  type: string;
  urgency: ProcessingUrgency;
  userId: string;
  status?: string;
  documentCode?: string;
  purpose?: string;
  quantity?: number;
  notes?: string;
  amount?: number;
}) {
  return createRequest({
    userId: input.userId,
    type: input.type,
    documentCode: input.documentCode || '',
    purpose: input.purpose || '',
    quantity: input.quantity || 1,
    notes: input.notes || '',
    urgency: input.urgency,
    amount: input.amount || 0,
  });
}
