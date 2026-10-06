import { requireSupabase } from './supabase';
import type { ProcessingUrgency } from './scheduling';
import { addNotification } from './notifications';
import { subscribeLocalAndRemote } from './realtime';
import {
  isPaymentStatus,
  isRequestStatus,
  tableMissing,
  type PaymentStatus,
  type RequestStatus,
} from './status';

const EVENT = 'pcc-requests-updated';

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
    message: `Your ${created.type} request (${created.id}) was sent to the Registrar for review.`,
    link: '/track',
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

export async function updateRequestStatus(uuid: string, status: RequestStatus, userId?: string, type?: string, code?: string) {
  const updated = await updateRequest(uuid, { status });
  if (userId) {
    const titles: Record<RequestStatus, string> = {
      pending: 'Request reset to review',
      approved: 'Request approved',
      processing: 'Document is being prepared',
      ready: 'Document ready for pickup',
      completed: 'Request completed',
      rejected: 'Request rejected',
    };
    await addNotification({
      userId,
      type: status === 'rejected' ? 'payment' : status === 'ready' ? 'ready' : 'approved',
      title: titles[status],
      message: `${type || 'Your document'} (${code || updated.id}) is now ${titles[status].toLowerCase()}.`,
      link: '/track',
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
