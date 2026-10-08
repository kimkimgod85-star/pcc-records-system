import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchRequests, getBookableRequests, type StudentRequest } from '../lib/requests';
import { playSubmitSound } from '../lib/officeChime';
import {
  countBookingsForSlot,
  findBookingForRequest,
  findFirstBookableDate,
  formatISODate,
  getPickupWindow,
  getStudentDateStatus,
  getStudentSlotStatus,
  isBeforeProcessingWindow,
  isPastDate,
  loadSchedule,
  parseISODate,
  subscribeSchedule,
  toISODate,
  upsertBooking,
  DEFAULT_SLOTS,
  type ScheduleState,
} from '../lib/scheduling';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SchedulingPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const today = new Date();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const bookableRequests = useMemo(() => getBookableRequests(requests, user?.id), [requests, user?.id]);
  const requestedId = searchParams.get('request');
  const [schedule, setSchedule] = useState<ScheduleState>({
    dailyLimit: 50,
    slots: DEFAULT_SLOTS.map(slot => ({ ...slot })),
    dateStatuses: {},
    bookings: [],
  });
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState(requestedId || '');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => { void loadSchedule().then(setSchedule); };
    Promise.all([loadSchedule(), user ? fetchRequests(user.id) : Promise.resolve([] as StudentRequest[])])
      .then(([sched, reqs]) => {
        setSchedule(sched);
        setRequests(reqs);
        const bookable = getBookableRequests(reqs, user?.id);
        setSelectedRequestId(prev => (
          (requestedId && bookable.some(item => item.id === requestedId) && requestedId)
          || (prev && bookable.some(item => item.id === prev) && prev)
          || bookable[0]?.id
          || ''
        ));
      })
      .finally(() => setLoaded(true));
    return subscribeSchedule(refresh);
  }, [user, requestedId]);

  const selectedRequest = bookableRequests.find(request => request.id === selectedRequestId) || null;
  const pickupWindow = selectedRequest ? getPickupWindow(selectedRequest.urgency, schedule) : null;
  const existingBooking = user && selectedRequest
    ? findBookingForRequest(schedule, user.id, selectedRequest.id)
    : null;

  useEffect(() => {
    if (!selectedRequest) return;
    const targetISO = existingBooking?.date || findFirstBookableDate(schedule, selectedRequest.urgency);
    const parsed = parseISODate(targetISO);
    setCurrentMonth(parsed.monthIndex);
    setCurrentYear(parsed.year);
    setSelectedDate(parsed.day);
    setSelectedSlot(null);
    setError('');
  }, [selectedRequestId]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const selectedIso = selectedDate ? toISODate(currentYear, currentMonth, selectedDate) : null;
  const earliestParsed = pickupWindow ? parseISODate(pickupWindow.earliestISO) : null;
  const canGoPrevMonth = !!earliestParsed && (
    currentYear > earliestParsed.year ||
    (currentYear === earliestParsed.year && currentMonth > earliestParsed.monthIndex)
  );

  const prevMonth = () => {
    if (!canGoPrevMonth) return;
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
    setSelectedSlot(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const getDateColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer border-green-200 dark:border-green-800';
      case 'reserved': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 cursor-pointer border-yellow-200 dark:border-yellow-800';
      case 'fully-booked': return 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 cursor-not-allowed border-red-200 dark:border-red-800';
      case 'closed': return 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-transparent';
      default: return 'border-transparent text-gray-300';
    }
  };

  const getSlotColor = (status: string, selected: boolean) => {
    if (selected) return 'border-blue-600 bg-blue-600 text-white';
    switch (status) {
      case 'available': return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:border-green-500 cursor-pointer';
      case 'reserved': return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:border-yellow-500 cursor-pointer';
      case 'fully-booked': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-400 cursor-not-allowed opacity-60';
      default: return '';
    }
  };

  const handleConfirm = async () => {
    if (!selectedIso || !selectedSlot || !selectedRequest || !user) return;
    if (isBeforeProcessingWindow(selectedIso, selectedRequest.urgency, schedule)) {
      setError(`Pickup for ${selectedRequest.urgency === 'rush' ? 'rush' : 'regular'} requests opens in ${selectedRequest.urgency === 'rush' ? '2–3' : '5–7'} business days.`);
      return;
    }
    const dateStatus = getStudentDateStatus(schedule, selectedIso);
    if (dateStatus === 'closed' || dateStatus === 'fully-booked') {
      setError('That date is not available for booking.');
      return;
    }
    const slot = schedule.slots.find(item => item.time === selectedSlot);
    if (!slot || getStudentSlotStatus(schedule, selectedIso, slot) === 'fully-booked') {
      setError('That time slot is already full. Please choose another.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await upsertBooking({
        date: selectedIso,
        time: selectedSlot,
        requestId: selectedRequest.id,
        requestUuid: selectedRequest.uuid,
        requestType: selectedRequest.type,
        userId: user.id,
        userName: user.name,
      });
      setSchedule(result.state);
      setConfirmed(true);
      playSubmitSound();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save booking.');
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8" aria-busy="true" aria-label="Loading your requests">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-7 w-72 max-w-full rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-4 w-full max-w-xl rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-28 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700" />
          <div className="h-80 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700" />
        </div>
      </div>
    );
  }

  if (bookableRequests.length === 0) {
    return (
      <div className="fade-in max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            No request to schedule
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You can book a pickup only after you submit a document request.
          </p>
          <Link to="/request" className="inline-flex px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            Request a Record
          </Link>
        </div>
      </div>
    );
  }

  if (confirmed && selectedIso && selectedSlot && selectedRequest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Schedule Confirmed!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Request: <span className="font-medium text-gray-900 dark:text-white">{selectedRequest.id}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Pickup Date: <span className="font-medium text-gray-900 dark:text-white">
              {formatISODate(selectedIso)}
            </span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Time: <span className="font-medium text-gray-900 dark:text-white">{selectedSlot}</span>
          </p>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-6">
            Please bring a valid ID and your request reference number when claiming your document.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/dashboard" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              Go to Dashboard
            </Link>
            <Link to="/track" className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
              Track Request
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-900 dark:text-white">Schedule Pickup</span>
        </div>
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Schedule Document Pickup
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose one of your requests, then book a date and time opened by the Registrar.
          Regular processing jumps to a 5–7 business day pickup window; rush jumps to 2–3 business days.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Request to schedule
        </label>
        <div className="grid sm:grid-cols-3 gap-2">
          {bookableRequests.map(request => (
            <button
              key={request.id}
              type="button"
              onClick={() => {
                setSelectedRequestId(request.id);
                setConfirmed(false);
              }}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                selectedRequestId === request.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">{request.type}</p>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{request.id}</p>
              <p className="text-xs mt-1">
                <span className="text-gray-500 dark:text-gray-400">{request.status}</span>
                <span className={`ml-1.5 font-semibold ${request.urgency === 'rush' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {request.urgency === 'rush' ? 'Rush 2–3 days' : 'Regular 5–7 days'}
                </span>
              </p>
            </button>
          ))}
        </div>
        {pickupWindow && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">
            Calendar jumped to the first available pickup: <span className="font-semibold">{formatISODate(pickupWindow.earliestISO)}</span> through <span className="font-semibold">{formatISODate(pickupWindow.latestISO)}</span> ({pickupWindow.label}).
          </p>
        )}
        {existingBooking && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
            Currently booked: {formatISODate(existingBooking.date)} at {existingBooking.time}. Confirming again will reschedule it.
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              disabled={!canGoPrevMonth}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toISODate(currentYear, currentMonth, day);
              const tooSoon = selectedRequest ? isBeforeProcessingWindow(iso, selectedRequest.urgency, schedule) : isPastDate(iso);
              const status = tooSoon ? 'closed' : getStudentDateStatus(schedule, iso);
              const inWindow = pickupWindow ? iso >= pickupWindow.earliestISO && iso <= pickupWindow.latestISO : false;
              const isSelected = selectedDate === day;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const canSelect = !tooSoon && (status === 'available' || status === 'reserved');

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (!canSelect) return;
                    setSelectedDate(day);
                    setSelectedSlot(null);
                    setError('');
                  }}
                  disabled={!canSelect}
                  className={`relative aspect-square flex items-center justify-center rounded-xl text-sm border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : getDateColor(status)
                  } ${isToday && !isSelected ? 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-800' : ''} ${
                    inWindow && canSelect && !isSelected ? 'ring-1 ring-orange-400 dark:ring-orange-500' : ''
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            {[
              { color: 'bg-green-400', label: 'Available' },
              { color: 'bg-yellow-400', label: 'Some slots booked' },
              { color: 'bg-red-400', label: 'Fully Booked' },
              { color: 'bg-gray-300 dark:bg-slate-600', label: 'Closed / Too soon / Past' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {selectedIso && selectedDate ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {MONTHS[currentMonth]} {selectedDate}, {currentYear}
                </h3>
              </div>
              {schedule.slots.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The registrar has not opened any time slots yet.
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Select a time slot:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {schedule.slots.map(slot => {
                      const status = getStudentSlotStatus(schedule, selectedIso, slot);
                      const booked = countBookingsForSlot(schedule, selectedIso, slot.time);
                      return (
                        <button
                          key={slot.time}
                          onClick={() => status !== 'fully-booked' && setSelectedSlot(slot.time)}
                          disabled={status === 'fully-booked'}
                          className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-sm sm:text-xs font-medium text-left transition-all ${getSlotColor(status, selectedSlot === slot.time)}`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            {slot.time}
                          </span>
                          <span className={`text-xs ${selectedSlot === slot.time ? 'text-blue-100' : 'opacity-80'}`}>
                            {booked}/{slot.limit} booked
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 text-center">
              <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select an open date from the calendar to view the registrar's time slots.
              </p>
            </div>
          )}

          {selectedIso && selectedSlot && selectedRequest && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Pickup Summary
              </h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Request</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right">{selectedRequest.id}</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Document</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right">{selectedRequest.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {MONTHS[currentMonth]} {selectedDate}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Time</span>
                  <span className="text-gray-900 dark:text-white font-medium">{selectedSlot}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Location</span>
                  <span className="text-gray-900 dark:text-white font-medium">Registrar's Office</span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 mb-4">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 mb-4">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Bring valid ID and reference number.</p>
              </div>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {loading ? 'Confirming...' : existingBooking ? 'Reschedule Pickup' : 'Confirm Schedule'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
