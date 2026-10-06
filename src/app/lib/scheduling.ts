import { requireSupabase } from './supabase';
import { addNotification } from './notifications';
import { formatLongDate, tableMissing } from './status';
import { subscribeLocalAndRemote } from './realtime';

const EVENT = 'pcc-scheduling-updated';

export type DateAvailability = 'open' | 'closed' | 'holiday';
export type StudentDateStatus = 'available' | 'reserved' | 'fully-booked' | 'closed';
export type StudentSlotStatus = 'available' | 'reserved' | 'fully-booked';

export interface ScheduleSlot {
  id: number;
  time: string;
  limit: number;
}

export interface PickupBooking {
  id: string;
  date: string;
  time: string;
  requestId: string;
  requestUuid: string;
  requestType: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ScheduleState {
  dailyLimit: number;
  slots: ScheduleSlot[];
  dateStatuses: Record<string, DateAvailability>;
  bookings: PickupBooking[];
}

export const DEFAULT_SLOTS: ScheduleSlot[] = [
  { id: 1, time: '8:00 AM', limit: 10 },
  { id: 2, time: '9:00 AM', limit: 10 },
  { id: 3, time: '10:00 AM', limit: 10 },
  { id: 4, time: '11:00 AM', limit: 10 },
  { id: 5, time: '1:00 PM', limit: 10 },
  { id: 6, time: '2:00 PM', limit: 10 },
  { id: 7, time: '3:00 PM', limit: 10 },
  { id: 8, time: '4:00 PM', limit: 10 },
];

export function toISODate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[month - 1]} ${day}, ${year}`;
}

export type ProcessingUrgency = 'regular' | 'rush';

export function isPastDate(iso: string) {
  const today = new Date();
  return iso < toISODate(today.getFullYear(), today.getMonth(), today.getDate());
}

export function todayISO() {
  const today = new Date();
  return toISODate(today.getFullYear(), today.getMonth(), today.getDate());
}

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, monthIndex: month - 1, day };
}

export function getProcessingWindow(urgency: ProcessingUrgency) {
  return urgency === 'rush'
    ? { minBusinessDays: 2, maxBusinessDays: 3, label: 'Rush (2–3 business days)' }
    : { minBusinessDays: 5, maxBusinessDays: 7, label: 'Regular (5–7 business days)' };
}

function isWeekendISO(iso: string) {
  const { year, monthIndex, day } = parseISODate(iso);
  const weekday = new Date(year, monthIndex, day).getDay();
  return weekday === 0 || weekday === 6;
}

export function addBusinessDays(startISO: string, days: number, state: ScheduleState) {
  const { year, monthIndex, day } = parseISODate(startISO);
  const cursor = new Date(year, monthIndex, day);
  let added = 0;
  while (added < days) {
    cursor.setDate(cursor.getDate() + 1);
    const iso = toISODate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (isWeekendISO(iso)) continue;
    if (getDateAvailability(iso, state) === 'holiday') continue;
    added += 1;
  }
  return toISODate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
}

export function getPickupWindow(urgency: ProcessingUrgency, state: ScheduleState) {
  const today = todayISO();
  const { minBusinessDays, maxBusinessDays, label } = getProcessingWindow(urgency);
  return {
    earliestISO: addBusinessDays(today, minBusinessDays, state),
    latestISO: addBusinessDays(today, maxBusinessDays, state),
    label,
  };
}

export function isBeforeProcessingWindow(iso: string, urgency: ProcessingUrgency, state: ScheduleState) {
  return iso < getPickupWindow(urgency, state).earliestISO;
}

export function findFirstBookableDate(state: ScheduleState, urgency: ProcessingUrgency) {
  const { earliestISO, latestISO } = getPickupWindow(urgency, state);
  const { year, monthIndex, day } = parseISODate(earliestISO);
  const cursor = new Date(year, monthIndex, day);

  let fallback: string | null = null;
  for (let i = 0; i < 60; i += 1) {
    const iso = toISODate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const status = getStudentDateStatus(state, iso);
    const bookable = status === 'available' || status === 'reserved';
    if (bookable) {
      if (iso <= latestISO) return iso;
      if (!fallback) fallback = iso;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fallback || earliestISO;
}

function cloneDefault(): ScheduleState {
  return {
    dailyLimit: 50,
    slots: DEFAULT_SLOTS.map(slot => ({ ...slot })),
    dateStatuses: {},
    bookings: [],
  };
}

type SettingsValue = {
  dailyLimit?: number;
  slots?: ScheduleSlot[];
  dateStatuses?: Record<string, DateAvailability>;
};

function parseSettings(value: SettingsValue | null | undefined, bookings: PickupBooking[]): ScheduleState {
  const fallback = cloneDefault();
  const slots = Array.isArray(value?.slots) && value.slots.length > 0
    ? value.slots.map(slot => ({
        id: Number(slot.id) || Date.now(),
        time: String(slot.time),
        limit: Math.max(1, Number(slot.limit) || 10),
      }))
    : fallback.slots;
  return {
    dailyLimit: typeof value?.dailyLimit === 'number' && value.dailyLimit > 0 ? value.dailyLimit : fallback.dailyLimit,
    slots,
    dateStatuses: value?.dateStatuses && typeof value.dateStatuses === 'object' ? value.dateStatuses : {},
    bookings,
  };
}

function mapBooking(row: Record<string, unknown>): PickupBooking {
  return {
    id: String(row.id),
    date: String(row.date || '').slice(0, 10),
    time: String(row.time || ''),
    requestId: String(row.request_code || row.request_id || ''),
    requestUuid: String(row.request_id || ''),
    requestType: String(row.request_type || ''),
    userId: String(row.user_id || ''),
    userName: String(row.user_name || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function loadSchedule(): Promise<ScheduleState> {
  try {
    const client = requireSupabase();
    const [{ data: settings, error: settingsError }, { data: bookings, error: bookingsError }] = await Promise.all([
      client.from('app_settings').select('value').eq('key', 'schedule').maybeSingle(),
      client.from('pickup_bookings').select('*, document_requests(request_code)').order('created_at'),
    ]);
    if (settingsError) throw settingsError;
    if (bookingsError) throw bookingsError;
    const mapped = (bookings || []).map(row => {
      const request = (row.document_requests as { request_code?: string } | null) || {};
      return mapBooking({ ...row, request_code: request.request_code || '' } as Record<string, unknown>);
    });
    return parseSettings(settings?.value as SettingsValue, mapped);
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return cloneDefault();
  }
}

export async function saveSchedule(partial: Partial<ScheduleState>) {
  const current = await loadSchedule();
  const next: ScheduleState = {
    dailyLimit: partial.dailyLimit ?? current.dailyLimit,
    slots: partial.slots ?? current.slots,
    dateStatuses: partial.dateStatuses ?? current.dateStatuses,
    bookings: partial.bookings ?? current.bookings,
  };
  const client = requireSupabase();
  const { error } = await client.from('app_settings').upsert({
    key: 'schedule',
    value: {
      dailyLimit: next.dailyLimit,
      slots: next.slots,
      dateStatuses: next.dateStatuses,
    },
  });
  if (error) throw error;
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export function subscribeSchedule(onChange: () => void) {
  return subscribeLocalAndRemote(EVENT, ['pickup_bookings', 'app_settings'], onChange);
}

export function getDateAvailability(iso: string, state: ScheduleState): DateAvailability {
  if (isPastDate(iso)) return 'closed';
  if (state.dateStatuses[iso]) return state.dateStatuses[iso];
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || weekday === 6) return 'closed';
  return 'open';
}

export function countBookingsForDate(state: ScheduleState, iso: string) {
  return state.bookings.filter(booking => booking.date === iso).length;
}

export function countBookingsForSlot(state: ScheduleState, iso: string, time: string) {
  return state.bookings.filter(booking => booking.date === iso && booking.time === time).length;
}

export function getStudentDateStatus(state: ScheduleState, iso: string): StudentDateStatus {
  if (isPastDate(iso)) return 'closed';
  if (getDateAvailability(iso, state) !== 'open') return 'closed';
  if (state.slots.length === 0) return 'closed';
  if (countBookingsForDate(state, iso) >= state.dailyLimit) return 'fully-booked';
  const allFull = state.slots.every(slot => countBookingsForSlot(state, iso, slot.time) >= slot.limit);
  if (allFull) return 'fully-booked';
  if (countBookingsForDate(state, iso) > 0) return 'reserved';
  return 'available';
}

export function getStudentSlotStatus(state: ScheduleState, iso: string, slot: ScheduleSlot): StudentSlotStatus {
  const booked = countBookingsForSlot(state, iso, slot.time);
  if (booked >= slot.limit) return 'fully-booked';
  if (booked / slot.limit >= 0.7) return 'reserved';
  return 'available';
}

export function findBookingForRequest(state: ScheduleState, userId: string, requestId: string) {
  return state.bookings.find(booking => booking.userId === userId && (booking.requestId === requestId || booking.requestUuid === requestId)) || null;
}

export async function upsertBooking(
  input: Omit<PickupBooking, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
) {
  const current = await loadSchedule();
  if (isPastDate(input.date)) {
    return { state: current, booking: findBookingForRequest(current, input.userId, input.requestId) };
  }

  const client = requireSupabase();
  const row = {
    request_id: input.requestUuid,
    user_id: input.userId,
    user_name: input.userName,
    date: input.date,
    time: input.time,
    request_type: input.requestType,
  };

  const { data, error } = await client
    .from('pickup_bookings')
    .upsert(row, { onConflict: 'request_id' })
    .select()
    .single();
  if (error || !data) throw error || new Error('Could not save booking.');

  await client
    .from('document_requests')
    .update({ pickup_date: input.date, pickup_time: input.time, updated_at: new Date().toISOString() })
    .eq('id', input.requestUuid);

  await addNotification({
    userId: input.userId,
    type: 'schedule',
    title: 'Pickup scheduled',
    message: `${input.requestType} (${input.requestId}) · ${formatLongDate(input.date)} at ${input.time} · Registrar’s Office. Bring a valid ID.`,
    link: `/track?request=${encodeURIComponent(input.requestId)}`,
  });

  const booking = mapBooking({ ...data, request_code: input.requestId } as Record<string, unknown>);
  window.dispatchEvent(new Event(EVENT));
  return { state: await loadSchedule(), booking };
}
