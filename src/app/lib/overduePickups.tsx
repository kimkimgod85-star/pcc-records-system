import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { requireSupabase, isSupabaseConfigured } from './supabase';
import { addNotification } from './notifications';
import { fetchRequests, subscribeRequests, trackLink, type StudentRequest } from './requests';
import { loadSchedule, subscribeSchedule, todayISO, type PickupBooking, type ScheduleState } from './scheduling';
import { formatLongDate, type RequestStatus } from './status';

/** Statuses where the document is still not ready for the student. */
const NOT_READY: RequestStatus[] = ['pending', 'approved', 'processing'];

export const RESCHEDULE_REASONS = [
  'The Registrar’s Office was busy with many requests',
  'There was a school event or activity',
  'Office staff were on official travel',
  'The office was closed (holiday or suspension)',
  'Your document is still being processed',
];

export interface OverduePickup {
  booking: PickupBooking;
  request: StudentRequest;
  daysLate: number;
}

function daysBetween(fromISO: string, toISO: string) {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function findOverduePickups(requests: StudentRequest[], bookings: PickupBooking[]): OverduePickup[] {
  const today = todayISO();
  const byUuid = new Map(requests.map(r => [r.uuid, r]));
  return bookings
    .filter(b => b.date && b.date < today)
    .map(booking => ({ booking, request: byUuid.get(booking.requestUuid) }))
    .filter((item): item is { booking: PickupBooking; request: StudentRequest } =>
      Boolean(item.request && NOT_READY.includes(item.request.status)))
    .map(item => ({ ...item, daysLate: daysBetween(item.booking.date, today) }))
    .sort((a, b) => a.booking.date.localeCompare(b.booking.date));
}

function delayLink(item: OverduePickup) {
  return `${trackLink(item.request.id)}&missed=${item.booking.date}`;
}

/** Sends each affected student one "pickup date moved" notice per missed date. */
async function notifyStudents(list: OverduePickup[]) {
  if (list.length === 0) return;
  const client = requireSupabase();
  const links = list.map(delayLink);
  const { data, error } = await client.from('notifications').select('link').in('link', links);
  if (error) { console.warn(error); return; }
  const sent = new Set((data || []).map(row => String(row.link)));

  for (const item of list) {
    const link = delayLink(item);
    if (sent.has(link)) continue;
    await addNotification({
      userId: item.booking.userId,
      type: 'schedule',
      title: 'Pickup date moved',
      message: `${item.request.type} (${item.request.id}) · Sorry, your document was not ready on your pickup date (${formatLongDate(item.booking.date)}) because the Registrar’s Office was busy. Please do not go to the office yet — the Registrar will set a new pickup date and notify you.`,
      link,
    });
  }
}

interface OverdueState {
  overdue: OverduePickup[];
  schedule: ScheduleState | null;
  refresh: () => void;
}

const OverdueContext = createContext<OverdueState>({ overdue: [], schedule: null, refresh: () => {} });

export function useOverduePickups() {
  return useContext(OverdueContext);
}

/** Loaded once in the admin layout: tracks overdue pickups and auto-notifies the students. */
export function OverduePickupsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [overdue, setOverdue] = useState<OverduePickup[]>([]);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const notifying = useRef(false);

  const refresh = useCallback(() => {
    if (!enabled || !isSupabaseConfigured) return;
    void Promise.all([fetchRequests(), loadSchedule()]).then(([requests, state]) => {
      const list = findOverduePickups(requests, state.bookings);
      setSchedule(state);
      setOverdue(list);
      if (notifying.current) return;
      notifying.current = true;
      void notifyStudents(list).finally(() => { notifying.current = false; });
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const stops = [subscribeRequests(refresh), subscribeSchedule(refresh)];
    const timer = window.setInterval(refresh, 30 * 60 * 1000);
    return () => { stops.forEach(stop => stop()); window.clearInterval(timer); };
  }, [enabled, refresh]);

  return <OverdueContext.Provider value={{ overdue, schedule, refresh }}>{children}</OverdueContext.Provider>;
}
