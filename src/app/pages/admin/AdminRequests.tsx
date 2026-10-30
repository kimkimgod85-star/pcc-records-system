import { btn, ICON_BTN } from '../../lib/ui';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Search, CheckCircle, X, ChevronRight, ArrowRight, AlertCircle, Loader2,
  StickyNote, CalendarClock, Copy, XCircle, CreditCard,
} from 'lucide-react';
import { fetchRequests, subscribeRequests, updateRequestStatus, type StudentRequest } from '../../lib/requests';
import { useOverduePickups } from '../../lib/overduePickups';
import { todayISO } from '../../lib/scheduling';
import { RescheduleDialog } from '../../components/RescheduleDialog';
import {
  canRejectRequest,
  canSetRequestStatus,
  formatPickup,
  formatShortDate,
  isPaymentVerified,
  paymentLabel,
  requiresVerifiedPayment,
  type PaymentStatus,
  type RequestStatus,
} from '../../lib/status';
import { DetailModal, MODAL_ASIDE, MODAL_BODY, MODAL_HEADER, MODAL_MAIN } from '../../components/DetailModal';
import { StatusBadge } from '../../components/StatusBadge';
import { RejectReasonDialog, REQUEST_REJECT_REASONS } from '../../components/RejectReasonDialog';
import { RejectionNotice } from '../../components/RejectionNotice';

type AdminRequestRow = {
  uuid: string;
  id: string;
  student: string;
  studentId: string;
  userId: string;
  type: string;
  purpose: string;
  quantity: number;
  copiesLabel: string;
  submitted: string;
  status: RequestStatus;
  paymentStatus: PaymentStatus;
  payment: string;
  notes: string;
  pickup: string;
  pickupLong: string;
  rejectionReason: string;
};

function copiesLabel(quantity: number) {
  const n = Math.max(1, quantity || 1);
  return `${n} ${n === 1 ? 'copy' : 'copies'}`;
}

function toRow(item: StudentRequest): AdminRequestRow {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  return {
    uuid: item.uuid,
    id: item.id,
    student: item.studentName,
    studentId: item.studentId || '—',
    userId: item.userId,
    type: item.type,
    purpose: item.purpose || '—',
    quantity,
    copiesLabel: copiesLabel(quantity),
    submitted: formatShortDate(item.createdAt),
    status: item.status,
    paymentStatus: item.paymentStatus,
    payment: paymentLabel(item.paymentStatus, item.paymentMethod),
    notes: item.notes,
    pickup: formatPickup(item.pickupDate, item.pickupTime),
    pickupLong: formatPickup(item.pickupDate, item.pickupTime, true),
    rejectionReason: item.rejectionReason,
  };
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  processing: 'Processing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
};

const FILTERS: { value: 'all' | RequestStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const NEXT_STEP: Partial<Record<RequestStatus, { status: RequestStatus; label: string; hint: string }>> = {
  pending: { status: 'approved', label: 'Approve request', hint: 'The student will be asked to pay.' },
  approved: { status: 'processing', label: 'Start processing', hint: 'Do this after the payment is verified.' },
  processing: { status: 'ready', label: 'Mark Ready for Pickup', hint: 'The student can then book a pickup.' },
  ready: { status: 'completed', label: 'Mark as Completed', hint: 'Use this once the student claims it.' },
};

/** Forward-flow chips only — Reject is a separate button to avoid accidents. */
const FLOW_ACTIONS: { status: RequestStatus; label: string; dot: string }[] = [
  { status: 'pending', label: 'Pending', dot: 'bg-orange-500' },
  { status: 'approved', label: 'Approved', dot: 'bg-blue-500' },
  { status: 'processing', label: 'Processing', dot: 'bg-purple-500' },
  { status: 'ready', label: 'Ready', dot: 'bg-cyan-500' },
  { status: 'completed', label: 'Completed', dot: 'bg-green-500' },
];

const paymentTone = (status: PaymentStatus) =>
  status === 'verified'
    ? 'text-green-700 dark:text-green-400'
    : status === 'rejected'
      ? 'text-red-600 dark:text-red-400'
      : status === 'pending'
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-gray-600 dark:text-gray-400';

export default function AdminRequests() {
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [searchParams] = useSearchParams();
  const linkedId = searchParams.get('id');
  const [selectedId, setSelectedId] = useState<string | null>(linkedId);
  const [saving, setSaving] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const { schedule, refresh: refreshOverdue } = useOverduePickups();

  useEffect(() => {
    const refresh = () => { fetchRequests().then(list => setRequests(list.map(toRow))); };
    refresh();
    return subscribeRequests(refresh);
  }, []);

  useEffect(() => {
    if (linkedId) setSelectedId(linkedId);
  }, [linkedId]);

  const selectedReq = requests.find(r => r.id === selectedId) ?? null;
  const selectedBooking = selectedReq ? schedule?.bookings.find(b => b.requestUuid === selectedReq.uuid) ?? null : null;

  const query = search.trim().toLowerCase();
  const searched = requests.filter(r =>
    !query ||
    r.id.toLowerCase().includes(query) ||
    r.student.toLowerCase().includes(query) ||
    r.studentId.toLowerCase().includes(query) ||
    r.type.toLowerCase().includes(query)
  );
  const filtered = statusFilter === 'all' ? searched : searched.filter(r => r.status === statusFilter);
  const countFor = (value: 'all' | RequestStatus) =>
    value === 'all' ? searched.length : searched.filter(r => r.status === value).length;

  const select = (id: string) => {
    setSelectedId(id);
    setError('');
  };

  const updateStatus = async (row: AdminRequestRow, status: RequestStatus, reason = '') => {
    const gate = canSetRequestStatus(row.status, status, row.paymentStatus);
    if (!gate.ok) {
      setError(gate.reason || 'That status change is not allowed.');
      return;
    }
    setSaving(status);
    setError('');
    try {
      await updateRequestStatus(row.uuid, status, row.userId, row.type, row.id, reason);
      setRequests(prev => prev.map(r => r.id === row.id ? { ...r, status, rejectionReason: status === 'rejected' ? reason : '' } : r));
      setRejecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the status. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const chooseStatus = (row: AdminRequestRow, status: RequestStatus) => {
    if (status === 'rejected') {
      if (!canRejectRequest(row.status)) {
        setError('This request can no longer be rejected from its current status.');
        return;
      }
      setError('');
      setRejecting(true);
      return;
    }
    void updateStatus(row, status);
  };

  const paid = selectedReq ? isPaymentVerified(selectedReq.paymentStatus) : false;
  const nextDef = selectedReq ? NEXT_STEP[selectedReq.status] : undefined;
  const nextGate = selectedReq && nextDef
    ? canSetRequestStatus(selectedReq.status, nextDef.status, selectedReq.paymentStatus)
    : null;
  const nextReady = Boolean(nextDef && nextGate?.ok);
  const nextBlockedUnpaid = Boolean(
    nextDef && requiresVerifiedPayment(nextDef.status) && selectedReq && !paid,
  );
  const showReject = selectedReq ? canRejectRequest(selectedReq.status) : false;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-full">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Manage Requests
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click a request to see details and update its status on the right.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3 sm:p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by request ID, student name, student ID, or document"
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5">
          {FILTERS.map(f => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {f.label}
                <span className={`min-w-[1.25rem] px-1 rounded-md text-xs tabular-nums ${
                  active ? 'bg-white/20' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {countFor(f.value)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5 items-start">
        {/* List */}
        <div className="lg:col-span-5 lg:max-h-[calc(100dvh-3rem)] bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden lg:flex lg:flex-col">
          <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && <span className="text-gray-400"> · {STATUS_LABEL[statusFilter]}</span>}
            </span>
          </div>

          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No requests found matching your filters.
            </div>
          )}

          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map(req => (
              <button
                key={req.id}
                type="button"
                onClick={() => select(req.id)}
                className={`relative w-full text-left px-4 py-3 transition-colors ${
                  selectedId === req.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                }`}
              >
                {selectedId === req.id && <span className="absolute left-0 inset-y-2 w-1 rounded-r bg-blue-600" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{req.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">{req.student}</p>
                  </div>
                  <StatusBadge status={req.status} label={STATUS_LABEL[req.status]} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                  <span className="font-mono text-blue-600 dark:text-blue-400 truncate">{req.id}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                    <Copy className="w-3 h-3" /> {req.copiesLabel}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap ml-auto">{req.submitted}</span>
                </div>
              </button>
            ))}
          </div>

          {filtered.length > 0 && (
            <div className="hidden sm:block">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-5 py-3">Request</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3 hidden md:table-cell">Copies</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Payment</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filtered.map(req => {
                    const active = selectedId === req.id;
                    return (
                      <tr
                        key={req.id}
                        onClick={() => select(req.id)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <td className="px-5 py-3.5 align-top">
                          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{req.type}</p>
                          <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{req.id}</p>
                        </td>
                        <td className="px-5 py-3.5 align-top">
                          <p className="text-sm text-gray-900 dark:text-white leading-snug">{req.student}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{req.studentId}</p>
                        </td>
                        <td className="px-5 py-3.5 align-top hidden md:table-cell">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{req.copiesLabel}</span>
                        </td>
                        <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                          <span className={`text-sm font-medium ${paymentTone(req.paymentStatus)}`}>{req.payment}</span>
                        </td>
                        <td className="px-5 py-3.5 align-top">
                          <StatusBadge status={req.status} label={STATUS_LABEL[req.status]} />
                        </td>
                        <td className="pr-4 py-3.5 align-top">
                          <ChevronRight className={`w-4 h-4 ${active ? 'text-blue-500' : 'text-gray-300 dark:text-slate-600'}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>

      </div>

        {/* Request details popup — details on the left, status actions on the right */}
        {selectedReq && (
          <DetailModal open onClose={() => setSelectedId(null)} locked={rejecting || rescheduling} label={`Request ${selectedReq.id}`}>
              <div className={MODAL_HEADER}>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {selectedReq.type}
                  </p>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5 break-all">{selectedReq.id}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <StatusBadge status={selectedReq.status} label={STATUS_LABEL[selectedReq.status]} />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                      <Copy className="w-3 h-3" /> {selectedReq.copiesLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                  className={ICON_BTN}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={MODAL_BODY}>
              {/* Student details + notes */}
              <div className={MODAL_MAIN}>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Request details</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                  <Field label="Student" value={selectedReq.student} />
                  <Field label="Student ID" value={selectedReq.studentId} mono />
                </dl>

                <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                  selectedReq.notes
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/15 dark:border-amber-800/60'
                    : 'bg-gray-50 border-gray-200 dark:bg-slate-900/40 dark:border-slate-700'
                }`}>
                  <StickyNote className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedReq.notes ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Student notes</p>
                    <p className={`text-sm mt-0.5 leading-relaxed break-words whitespace-pre-wrap ${
                      selectedReq.notes ? 'text-amber-950 dark:text-amber-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {selectedReq.notes || 'No notes from the student.'}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                  <Field label="Copies" value={selectedReq.copiesLabel} highlight />
                  <Field label="Payment" value={selectedReq.payment} tone={paymentTone(selectedReq.paymentStatus)} />
                  <Field label="Submitted" value={selectedReq.submitted} />
                  <Field label="Purpose" value={selectedReq.purpose} wide />
                </dl>

                <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                  selectedReq.pickup
                    ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/15 dark:border-cyan-800/60'
                    : 'bg-gray-50 border-gray-200 dark:bg-slate-900/40 dark:border-slate-700'
                }`}>
                  <CalendarClock className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedReq.pickup ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-400'}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pickup</p>
                    <p className={`text-xs font-semibold mt-0.5 ${selectedReq.pickup ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {selectedReq.pickupLong || 'Not booked yet'}
                    </p>
                  </div>
                </div>

                {selectedReq.status === 'rejected' && (
                  <RejectionNotice
                    compact
                    title="Rejected · sent to student"
                    text={selectedReq.rejectionReason}
                    fallback="No reason recorded."
                  />
                )}
              </div>

              {/* Status actions — payment-gated, Reject separated */}
              <div className={`${MODAL_ASIDE} space-y-2.5`}>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Update status</p>

                {error && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" />
                    <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {nextBlockedUnpaid && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                    <CreditCard className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Payment not verified yet</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5 leading-snug">
                        You cannot process this request until payment is verified.
                      </p>
                      <Link
                        to="/admin/payments"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-100 underline underline-offset-2"
                      >
                        Open Payments
                      </Link>
                    </div>
                  </div>
                )}

                {nextDef && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedReq, nextDef.status)}
                      disabled={saving !== null || !nextReady}
                      title={!nextReady ? (nextGate?.reason || 'Not available yet') : undefined}
                      className={btn('primary', 'md', 'w-full')}
                    >
                      {saving === nextDef.status ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      {nextDef.label}
                    </button>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center -mt-1">
                      {nextReady ? nextDef.hint : (nextGate?.reason || nextDef.hint)}
                    </p>
                  </>
                )}

                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-2">
                  {FLOW_ACTIONS.map(action => {
                    const current = selectedReq.status === action.status;
                    const gate = canSetRequestStatus(selectedReq.status, action.status, selectedReq.paymentStatus);
                    const locked = !current && !gate.ok;
                    return (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => chooseStatus(selectedReq, action.status)}
                        disabled={current || locked || saving !== null}
                        title={locked ? gate.reason : undefined}
                        className={`inline-flex items-center justify-center gap-1 px-1 py-2 rounded-lg text-[11px] font-medium border transition-colors ${
                          current
                            ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-default'
                            : locked
                              ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-500'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {saving === action.status ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : current ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${locked ? 'bg-gray-300 dark:bg-slate-600' : action.dot}`} />
                        )}
                        {action.label}
                      </button>
                    );
                  })}
                </div>

                {selectedBooking && selectedReq.status !== 'completed' && selectedReq.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => setRescheduling(true)}
                    disabled={saving !== null}
                    className={btn(selectedBooking.date < todayISO() ? 'primary' : 'secondary', 'md', 'w-full')}
                  >
                    <CalendarClock className="w-4 h-4" />
                    {selectedBooking.date < todayISO() ? 'Reschedule again' : 'Reschedule pickup'}
                  </button>
                )}

                {showReject ? (
                  <button
                    type="button"
                    onClick={() => chooseStatus(selectedReq, 'rejected')}
                    disabled={saving !== null}
                    className={btn('dangerOutline', 'md', 'w-full')}
                  >
                    {saving === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject request
                  </button>
                ) : selectedReq.status === 'rejected' ? (
                  <p className="text-[11px] text-center text-red-600 dark:text-red-400 font-medium">This request was rejected.</p>
                ) : null}
              </div>
              </div>
          </DetailModal>
        )}

      <RescheduleDialog
        open={rescheduling && Boolean(selectedReq && selectedBooking)}
        booking={selectedBooking}
        requestCode={selectedReq?.id ?? ''}
        requestType={selectedReq?.type ?? ''}
        studentName={selectedReq?.student ?? ''}
        schedule={schedule}
        onClose={() => setRescheduling(false)}
        onSaved={refreshOverdue}
      />

      <RejectReasonDialog
        open={rejecting && Boolean(selectedReq)}
        title="Reject this request?"
        subject={selectedReq ? `${selectedReq.type} (${selectedReq.id}) · ${selectedReq.copiesLabel} · ${selectedReq.student}` : ''}
        reasons={REQUEST_REJECT_REASONS}
        busy={saving === 'rejected'}
        error={rejecting ? error : ''}
        onCancel={() => setRejecting(false)}
        onConfirm={reason => { if (selectedReq) void updateStatus(selectedReq, 'rejected', reason); }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  wide,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
  tone?: string;
  highlight?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : 'min-w-0'}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-sm mt-0.5 break-words leading-snug ${
        highlight ? 'font-semibold text-gray-900 dark:text-white' : `font-medium ${tone || 'text-gray-900 dark:text-white'}`
      } ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
