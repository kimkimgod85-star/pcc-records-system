export type RequestStatus = 'pending' | 'approved' | 'processing' | 'ready' | 'completed' | 'rejected';
export type PaymentStatus = 'unpaid' | 'pending' | 'verified' | 'rejected' | 'pay_later';

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  processing: 'Processing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
};

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  pending: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/30',
  approved: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30',
  processing: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/30',
  ready: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-400/30',
  completed: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/30',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30',
};

export const REQUEST_STATUS_DOT: Record<RequestStatus, string> = {
  pending: 'bg-orange-500',
  approved: 'bg-blue-500',
  processing: 'bg-purple-500',
  ready: 'bg-cyan-500',
  completed: 'bg-green-500',
  rejected: 'bg-red-500',
};

export function isRequestStatus(value: unknown): value is RequestStatus {
  return value === 'pending' || value === 'approved' || value === 'processing' || value === 'ready' || value === 'completed' || value === 'rejected';
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return value === 'unpaid' || value === 'pending' || value === 'verified' || value === 'rejected' || value === 'pay_later';
}

export function statusToStep(status: RequestStatus) {
  if (status === 'rejected') return 0;
  const steps: RequestStatus[] = ['pending', 'approved', 'processing', 'ready', 'completed'];
  return Math.max(0, steps.indexOf(status));
}

export function formatLongDate(value?: string | null) {
  if (!value) return 'TBD';
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return value;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[month - 1]} ${day}, ${year}`;
}

/** e.g. "Thu, Oct 9, 2026 · 9:00 AM" — the exact pickup slot the student booked. */
export function formatPickup(date?: string | null, time?: string | null, long = false) {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return date;
  const when = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: long ? 'long' : 'short',
    month: long ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return time ? `${when} · ${time}` : when;
}

export function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

export function timeAgo(iso: string) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export function paymentLabel(status: PaymentStatus, method?: string | null) {
  if (status === 'verified') return method === 'cashier' ? 'Paid at Cashier' : method === 'gcash' ? 'Paid via GCash' : 'Paid';
  if (status === 'pending') return method === 'cashier' ? 'Receipt submitted · awaiting verification' : 'Paid · awaiting verification';
  if (status === 'pay_later') return 'Pay later';
  if (status === 'rejected') return 'Payment rejected';
  return 'Not yet paid';
}

export function tableMissing(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : '';
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  return code === 'PGRST205' || code === '42P01' || /could not find the table/i.test(message) || /does not exist/i.test(message);
}
