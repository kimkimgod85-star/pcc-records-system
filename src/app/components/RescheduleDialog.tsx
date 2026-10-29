import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { DetailModal, MODAL_HEADER } from './DetailModal';
import { btn, ICON_BTN } from '../lib/ui';
import { RESCHEDULE_REASONS } from '../lib/overduePickups';
import {
  adminRescheduleBooking,
  getStudentDateStatus,
  getStudentSlotStatus,
  todayISO,
  toISODate,
  type PickupBooking,
  type ScheduleState,
} from '../lib/scheduling';
import { formatLongDate, formatPickup } from '../lib/status';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const OTHER = '__other__';

const FIELD =
  'w-full h-10 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

export function RescheduleDialog({
  open,
  booking,
  requestCode,
  requestType,
  studentName,
  schedule,
  onClose,
  onSaved,
}: {
  open: boolean;
  booking: PickupBooking | null;
  requestCode: string;
  requestType: string;
  studentName: string;
  schedule: ScheduleState | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [choice, setChoice] = useState('');
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const t = new Date();
    setMonth(t.getMonth());
    setYear(t.getFullYear());
    setDate('');
    setTime('');
    setChoice('');
    setCustom('');
    setNote('');
    setError('');
  }, [open, booking?.id]);

  if (!open || !booking || !schedule) return null;

  // Ignore this booking itself when counting how full a date or slot is.
  const others: ScheduleState = { ...schedule, bookings: schedule.bookings.filter(b => b.id !== booking.id) };
  const today = todayISO();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const reason = choice === OTHER ? custom.trim() : choice;

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  };

  const save = async () => {
    if (!date || !time) { setError('Pick a new date and time.'); return; }
    if (reason.length < 3) { setError('Choose a reason, or type one under Other.'); return; }
    setBusy(true);
    setError('');
    try {
      const sentence = /[.!?]$/.test(reason) ? reason : `${reason}.`;
      const extra = note.trim() ? ` ${/[.!?]$/.test(note.trim()) ? note.trim() : `${note.trim()}.`}` : '';
      await adminRescheduleBooking({ booking, requestCode, requestType, date, time, reason: `${sentence}${extra}` });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the new schedule.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DetailModal open onClose={onClose} locked={busy} label="Reschedule pickup">
      <div className={MODAL_HEADER}>
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Reschedule pickup
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {studentName} · {requestType} · <span className="font-mono">{requestCode}</span>
            </p>
            <p className="text-xs mt-1 text-red-600 dark:text-red-400 font-medium">
              Booked: {formatPickup(booking.date, booking.time, true) || formatLongDate(booking.date)}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className={ICON_BTN}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid md:grid-cols-2">
        {/* New date + time */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">New date</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => shift(-1)} disabled={isCurrentMonth} aria-label="Previous month" className={ICON_BTN}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="w-32 text-center text-sm font-medium text-gray-700 dark:text-gray-200">{MONTHS[month]} {year}</span>
              <button type="button" onClick={() => shift(1)} aria-label="Next month" className={ICON_BTN}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS.map(d => <span key={d} className="text-[10px] font-semibold uppercase text-gray-400 py-1">{d}</span>)}
            {Array.from({ length: firstDay }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const iso = toISODate(year, month, i + 1);
              const status = iso < today ? 'closed' : getStudentDateStatus(others, iso);
              const bookable = status === 'available' || status === 'reserved';
              const picked = date === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!bookable}
                  onClick={() => { setDate(iso); setTime(''); }}
                  className={`h-9 rounded-lg text-sm font-medium border transition-colors ${
                    picked
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : bookable
                        ? 'bg-green-50 border-green-200 text-green-800 hover:border-green-400 dark:bg-green-900/20 dark:border-green-800/70 dark:text-green-300'
                        : 'border-transparent text-gray-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Time {date && <span className="font-normal text-gray-500 dark:text-gray-400">· {formatLongDate(date)}</span>}
            </p>
            {!date ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Pick a green date first.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {schedule.slots.map(slot => {
                  const full = getStudentSlotStatus(others, date, slot) === 'fully-booked';
                  const picked = time === slot.time;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={full}
                      onClick={() => setTime(slot.time)}
                      className={`h-9 rounded-lg text-xs font-semibold border transition-colors ${
                        picked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : full
                            ? 'border-gray-100 text-gray-300 line-through cursor-not-allowed dark:border-slate-700 dark:text-slate-600'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:bg-slate-900 dark:border-slate-600 dark:text-gray-200'
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="px-5 py-4 space-y-3 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Reason <span className="text-red-500">*</span>
            <span className="font-normal text-xs text-gray-500 dark:text-gray-400"> · sent to the student</span>
          </p>
          <div className="space-y-1.5" role="radiogroup" aria-label="Reason">
            {[...RESCHEDULE_REASONS, OTHER].map(option => {
              const picked = choice === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => setChoice(option)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] leading-snug flex items-start gap-2 transition-colors ${
                    picked
                      ? 'border-blue-400 bg-blue-50 text-blue-900 ring-1 ring-blue-300 dark:border-blue-600 dark:bg-blue-900/25 dark:text-blue-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200'
                  }`}
                >
                  <span className={`mt-px w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    picked ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-slate-500'
                  }`}>
                    {picked && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
                  </span>
                  {option === OTHER ? 'Other reason…' : option}
                </button>
              );
            })}
          </div>
          {choice === OTHER && (
            <input value={custom} onChange={e => setCustom(e.target.value)} maxLength={200} placeholder="Type the reason" className={FIELD} autoFocus />
          )}
          <div>
            <label htmlFor="resched-note" className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="resched-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={300}
              placeholder="e.g. Sorry for the delay. Please bring your OR and valid ID."
              className={FIELD}
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2.5 px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40">
        <div className="flex-1 min-w-0">
          {error ? (
            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}</p>
          ) : (
            <p className="hidden sm:block text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {date && time ? `New pickup: ${formatPickup(date, time, true)}` : 'The student gets a notification with the new date and reason.'}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} disabled={busy} className={btn('secondary')}>Cancel</button>
        <button type="button" onClick={save} disabled={busy} className={btn('primary')}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
          Save new schedule
        </button>
      </div>
    </DetailModal>
  );
}
