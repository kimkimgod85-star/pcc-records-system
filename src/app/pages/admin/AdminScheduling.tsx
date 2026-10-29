import { btn, ICON_BTN_DANGER } from '../../lib/ui';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, CheckCircle, CalendarDays, AlertCircle, Users } from 'lucide-react';
import {
  DEFAULT_SLOTS,
  countBookingsForDate,
  countBookingsForSlot,
  getDateAvailability,
  isPastDate,
  loadSchedule,
  saveSchedule,
  subscribeSchedule,
  toISODate,
  type DateAvailability,
  type PickupBooking,
  type ScheduleSlot,
} from '../../lib/scheduling';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CARD = 'bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm';
const INPUT =
  'w-full h-10 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const LABEL = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5';

const DATE_OPTIONS: { value: DateAvailability; label: string; active: string }[] = [
  { value: 'open', label: 'Open', active: 'bg-green-600 text-white shadow-sm' },
  { value: 'closed', label: 'Closed', active: 'bg-slate-700 text-white shadow-sm dark:bg-slate-500' },
  { value: 'holiday', label: 'Holiday', active: 'bg-red-600 text-white shadow-sm' },
];

const LEGEND = [
  { dot: 'bg-green-500', label: 'Open' },
  { dot: 'bg-slate-400', label: 'Closed' },
  { dot: 'bg-red-500', label: 'Holiday' },
  { dot: 'bg-gray-200 dark:bg-slate-600', label: 'Past' },
];

export default function AdminScheduling() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>(DEFAULT_SLOTS.map(slot => ({ ...slot })));
  const [dateStatuses, setDateStatuses] = useState<Record<string, DateAvailability>>({});
  const [dailyLimit, setDailyLimit] = useState(50);
  const [bookings, setBookings] = useState<PickupBooking[]>([]);
  const [newSlotTime, setNewSlotTime] = useState('08:00');
  const [newSlotLimit, setNewSlotLimit] = useState(10);
  const [slotError, setSlotError] = useState('');
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refreshBookings = () => { void loadSchedule().then(loaded => setBookings(loaded.bookings)); };

  useEffect(() => {
    void loadSchedule().then(loaded => {
      setSlots(loaded.slots);
      setDateStatuses(loaded.dateStatuses);
      setDailyLimit(loaded.dailyLimit);
      setBookings(loaded.bookings);
      setHydrated(true);
    });
    return subscribeSchedule(refreshBookings);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveSchedule({ dailyLimit, slots, dateStatuses });
  }, [hydrated, dailyLimit, slots, dateStatuses]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedIso = selectedDate ? toISODate(year, month, selectedDate) : null;
  const schedule = { dailyLimit, slots, dateStatuses, bookings };
  const selectedAvailability = selectedIso ? getDateAvailability(selectedIso, schedule) : null;
  const selectedBookings = selectedIso ? bookings.filter(booking => booking.date === selectedIso) : [];
  const selectedDayCount = selectedIso ? countBookingsForDate(schedule, selectedIso) : 0;
  const showSelected = Boolean(selectedDate && selectedIso && selectedAvailability && !isPastDate(selectedIso));

  const persistFlash = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const formatTime12h = (time24: string) => {
    const [hh, mm] = time24.split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return time24;
    const suffix = hh >= 12 ? 'PM' : 'AM';
    const hour12 = hh % 12 || 12;
    return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
  };

  const timeToMinutes = (time12: string) => {
    const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return Number.POSITIVE_INFINITY;
    const h = Number(match[1]);
    const m = Number(match[2]);
    const ap = match[3].toUpperCase();
    const base = (h % 12) * 60 + m;
    return ap === 'PM' ? base + 12 * 60 : base;
  };

  const addSlot = () => {
    if (!newSlotTime) { setSlotError('Pick a time first.'); return; }
    const formatted = formatTime12h(newSlotTime);
    if (slots.some(slot => slot.time.toLowerCase() === formatted.toLowerCase())) {
      setSlotError(`${formatted} is already a time slot.`);
      return;
    }
    setSlotError('');
    setSlots(prev => {
      const next = [...prev, { id: Date.now(), time: formatted, limit: Math.max(1, newSlotLimit || 1) }];
      next.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      return next;
    });
    persistFlash();
  };

  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const canGoPrevMonth = !isCurrentMonth && (
    year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())
  );

  const prevMonth = () => {
    if (!canGoPrevMonth) return;
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const setDateStatus = (day: number, status: DateAvailability) => {
    const iso = toISODate(year, month, day);
    if (isPastDate(iso)) return;
    setDateStatuses(prev => ({ ...prev, [iso]: status }));
    persistFlash();
  };

  const updateSlotLimit = (id: number, limit: number) => {
    setSlots(prev => prev.map(slot => slot.id === id ? { ...slot, limit: Math.max(1, limit) } : slot));
  };

  const removeSlot = (id: number) => {
    setSlots(prev => prev.filter(slot => slot.id !== id));
    persistFlash();
  };

  const getSlotStatus = (slot: ScheduleSlot, booked: number) => {
    const pct = booked / slot.limit;
    if (pct >= 1) return { label: 'Full', pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', bar: 'bg-red-500' };
    if (pct >= 0.7) return { label: 'Almost full', pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', bar: 'bg-amber-500' };
    return { label: 'Available', pill: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', bar: 'bg-green-500' };
  };

  const getDateStyle = (day: number) => {
    const iso = toISODate(year, month, day);
    const past = isPastDate(iso);
    const status = getDateAvailability(iso, schedule);
    const isSelected = selectedDate === day;
    if (past) return 'bg-transparent text-gray-300 dark:text-slate-600 border-transparent cursor-not-allowed';
    if (isSelected) return 'bg-blue-600 text-white border-blue-600 shadow-sm';
    if (status === 'holiday') return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/70 hover:border-red-400';
    if (status === 'closed') return 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400';
    return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800/70 hover:border-green-400';
  };

  const dayPct = dailyLimit > 0 ? Math.min(100, (selectedDayCount / dailyLimit) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
            Scheduling Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Open dates and time slots here. Students can only book what you make available.
          </p>
        </div>
        <button
          onClick={persistFlash}
          className={btn(saved ? 'success' : 'primary')}
        >
          <CheckCircle className="w-4 h-4" />
          {saved ? 'Saved & visible to students' : 'Save schedule'}
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-5 items-start">
        {/* Calendar */}
        <div className={`lg:col-span-3 ${CARD} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                disabled={!canGoPrevMonth}
                aria-label="Previous month"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="min-w-[10rem] text-center font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                aria-label="Next month"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="daily-limit" className="text-xs font-medium text-gray-600 dark:text-gray-400">Daily limit</label>
              <input
                id="daily-limit"
                type="number"
                value={dailyLimit}
                onChange={e => setDailyLimit(Number(e.target.value))}
                min={1}
                max={100}
                className="w-20 h-9 px-2 text-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const iso = toISODate(year, month, day);
                const past = isPastDate(iso);
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const count = past ? 0 : countBookingsForDate(schedule, iso);
                return (
                  <button
                    key={day}
                    onClick={() => { if (!past) setSelectedDate(day); }}
                    disabled={past}
                    className={`relative h-11 sm:h-12 flex flex-col items-center justify-center rounded-lg text-sm font-medium border transition-colors ${getDateStyle(day)} ${
                      isToday && selectedDate !== day ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800' : ''
                    }`}
                  >
                    <span className="tabular-nums leading-none">{day}</span>
                    {count > 0 && (
                      <span className={`mt-1 text-[10px] leading-none font-semibold tabular-nums ${selectedDate === day ? 'text-blue-100' : 'opacity-80'}`}>
                        {count} booked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
              {LEGEND.map(item => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                  {item.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-blue-500" />
                Today
              </span>
            </div>
          </div>

          {showSelected && selectedDate && (
            <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{MONTHS[month]} {selectedDate}, {year}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedAvailability === 'open' ? 'Open for student booking' : selectedAvailability === 'holiday' ? 'Holiday — no booking' : 'Closed — no booking'}
                    </p>
                  </div>
                </div>

                <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                  {DATE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setDateStatus(selectedDate, option.value)}
                      className={`w-20 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        selectedAvailability === option.value
                          ? option.active
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Pickups booked</span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{selectedDayCount} / {dailyLimit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${dayPct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          {/* Time slots */}
          <div className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Time Slots</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Used on every date marked Open.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 tabular-nums">
                {slots.length} slot{slots.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Add a time slot</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-slot-time" className={LABEL}>Time</label>
                    <input
                      id="new-slot-time"
                      type="time"
                      value={newSlotTime}
                      onChange={e => { setNewSlotTime(e.target.value); setSlotError(''); }}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-slot-limit" className={LABEL}>Max students</label>
                    <input
                      id="new-slot-limit"
                      type="number"
                      value={newSlotLimit}
                      onChange={e => setNewSlotLimit(Number(e.target.value))}
                      min={1}
                      max={50}
                      className={INPUT}
                    />
                  </div>
                </div>
                {slotError && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" /> {slotError}
                  </p>
                )}
                <button
                  onClick={addSlot}
                  className={btn('primary', 'md', 'mt-3 w-full')}
                >
                  <Plus className="w-4 h-4" /> Add slot
                </button>
              </div>

              {slots.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No time slots yet. Add one above.</p>
              ) : (
                <ul className="space-y-2">
                  {slots.map(slot => {
                    const booked = selectedIso ? countBookingsForSlot(schedule, selectedIso, slot.time) : 0;
                    const status = getSlotStatus(slot, booked);
                    const pct = Math.min(100, (booked / slot.limit) * 100);
                    return (
                      <li key={slot.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{slot.time}</p>
                            {selectedIso ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-px rounded text-[10px] font-semibold ${status.pill}`}>{status.label}</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">{booked}/{slot.limit} booked</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 inline-flex items-center gap-1">
                                <Users className="w-3 h-3" /> Up to {slot.limit} per open day
                              </p>
                            )}
                          </div>
                          <label className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Max</span>
                            <input
                              type="number"
                              value={slot.limit}
                              onChange={e => updateSlotLimit(slot.id, Number(e.target.value))}
                              min={Math.max(1, booked)}
                              max={50}
                              aria-label={`Max students for ${slot.time}`}
                              className="w-16 h-9 px-2 text-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </label>
                          <button
                            onClick={() => removeSlot(slot.id)}
                            aria-label={`Remove ${slot.time}`}
                            className={`${ICON_BTN_DANGER} flex-shrink-0`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {selectedIso && (
                          <div className="h-1 bg-gray-100 dark:bg-slate-700">
                            <div className={`h-full transition-all ${status.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Bookings for selected date */}
          {showSelected && (
            <div className={`${CARD} overflow-hidden`}>
              <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Bookings · {MONTHS[month]} {selectedDate}
                </h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 tabular-nums">
                  {selectedBookings.length}
                </span>
              </div>
              {selectedBookings.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No student bookings on this date yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                  {selectedBookings.map(booking => (
                    <li key={booking.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-20 flex-shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300 tabular-nums">{booking.time}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{booking.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          <span className="font-mono">{booking.requestId}</span> · {booking.requestType}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
