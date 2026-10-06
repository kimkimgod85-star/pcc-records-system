import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Users, CheckCircle } from 'lucide-react';
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
    const formatted = formatTime12h(newSlotTime);
    setSlots(prev => {
      if (prev.some(slot => slot.time.toLowerCase() === formatted.toLowerCase())) return prev;
      const next = [...prev, { id: Date.now(), time: formatted, limit: Math.max(1, newSlotLimit) }];
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
    if (pct >= 1) return { label: 'Full', color: 'text-red-500 dark:text-red-400', bar: 'bg-red-500' };
    if (pct >= 0.7) return { label: 'Almost Full', color: 'text-yellow-500 dark:text-yellow-400', bar: 'bg-yellow-500' };
    return { label: 'Available', color: 'text-green-500 dark:text-green-400', bar: 'bg-green-500' };
  };

  const getDateStyle = (day: number) => {
    const iso = toISODate(year, month, day);
    const past = isPastDate(iso);
    const status = getDateAvailability(iso, schedule);
    const isSelected = selectedDate === day;
    if (past) return 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-transparent cursor-not-allowed opacity-60';
    if (isSelected) return 'bg-blue-600 text-white border-blue-600';
    if (status === 'holiday') return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-200 cursor-pointer';
    if (status === 'closed') return 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-transparent';
    return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-200 cursor-pointer';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Scheduling Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Open dates and time slots here. Students with a document request can only book what you make available.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Request Limit:</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={e => setDailyLimit(Number(e.target.value))}
            min={1}
            max={100}
            className="w-20 px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { color: 'bg-green-400', label: 'Open for booking' },
            { color: 'bg-gray-400', label: 'Closed' },
            { color: 'bg-red-400', label: 'Holiday' },
            { color: 'bg-gray-300', label: 'Past / Unavailable' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              disabled={!canGoPrevMonth}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toISODate(year, month, day);
              const past = isPastDate(iso);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <button
                  key={day}
                  onClick={() => {
                    if (past) return;
                    setSelectedDate(day);
                  }}
                  disabled={past}
                  className={`relative aspect-square flex items-center justify-center rounded-xl text-sm border transition-all ${getDateStyle(day)} ${
                    isToday && selectedDate !== day ? 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-800' : ''
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {selectedDate && selectedIso && selectedAvailability && !isPastDate(selectedIso) && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {MONTHS[month]} {selectedDate}: {' '}
                  <span
                    className={
                      selectedAvailability === 'open'
                        ? 'text-green-600 dark:text-green-400'
                        : selectedAvailability === 'holiday'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  >
                    {selectedAvailability === 'open'
                      ? 'Open for student booking'
                      : selectedAvailability === 'holiday'
                      ? 'Holiday'
                      : 'Closed'}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDateStatus(selectedDate, 'open')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedAvailability === 'open'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setDateStatus(selectedDate, 'closed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedAvailability === 'closed'
                        ? 'bg-gray-700 text-white dark:bg-slate-600'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Closed
                  </button>
                  <button
                    onClick={() => setDateStatus(selectedDate, 'holiday')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedAvailability === 'holiday'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200'
                    }`}
                  >
                    Holiday
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedDayCount} / {dailyLimit} pickups booked on this date.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Time Slots
              </h3>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl mb-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={e => setNewSlotTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Limit
                  </label>
                  <input
                    type="number"
                    value={newSlotLimit}
                    onChange={e => setNewSlotLimit(Number(e.target.value))}
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addSlot}
                  className="sm:mb-[1px] flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Slot
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                These times appear on every date you mark as <span className="font-medium">Open</span>.
              </p>
            </div>

            <div className="space-y-3">
              {slots.map(slot => {
                const booked = selectedIso ? countBookingsForSlot(schedule, selectedIso, slot.time) : 0;
                const status = getSlotStatus(slot, booked);
                const pct = Math.min(100, (booked / slot.limit) * 100);
                return (
                  <div key={slot.id} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{slot.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${status.color}`}>{selectedIso ? status.label : 'Capacity'}</span>
                        <button onClick={() => removeSlot(slot.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedIso ? `${booked}/${slot.limit} booked` : `Limit ${slot.limit} per open day`}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Limit:</span>
                        <input
                          type="number"
                          value={slot.limit}
                          onChange={e => updateSlotLimit(slot.id, Number(e.target.value))}
                          min={Math.max(1, booked)}
                          max={50}
                          className="w-14 px-2 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded text-xs text-center text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${status.bar}`}
                        style={{ width: `${selectedIso ? pct : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedIso && !isPastDate(selectedIso) && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Bookings for {MONTHS[month]} {selectedDate}
              </h3>
              {selectedBookings.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No student bookings on this date yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedBookings.map(booking => (
                    <div key={booking.id} className="p-2.5 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{booking.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {booking.time} · {booking.requestId} · {booking.requestType}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={persistFlash}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors ${
              saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {saved ? 'Saved & visible to students' : 'Save Schedule Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
