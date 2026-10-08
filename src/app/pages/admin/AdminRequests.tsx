import { useEffect, useState } from 'react';
import { Search, CheckCircle, X, ChevronRight, ArrowRight, AlertCircle, Loader2, StickyNote, CalendarClock } from 'lucide-react';
import { fetchRequests, subscribeRequests, updateRequestStatus, type StudentRequest } from '../../lib/requests';
import { formatPickup, formatShortDate, paymentLabel, type PaymentStatus, type RequestStatus } from '../../lib/status';
import { useRevealOnSmallScreen } from '../../lib/useRevealOnSmallScreen';
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
  submitted: string;
  status: RequestStatus;
  paymentStatus: PaymentStatus;
  payment: string;
  notes: string;
  pickup: string;
  pickupLong: string;
  rejectionReason: string;
};

function toRow(item: StudentRequest): AdminRequestRow {
  return {
    uuid: item.uuid,
    id: item.id,
    student: item.studentName,
    studentId: item.studentId || '—',
    userId: item.userId,
    type: item.type,
    purpose: item.purpose || '—',
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

const ALL_ACTIONS: { status: RequestStatus; label: string; dot: string }[] = [
  { status: 'pending', label: 'Pending', dot: 'bg-orange-500' },
  { status: 'approved', label: 'Approved', dot: 'bg-blue-500' },
  { status: 'processing', label: 'Processing', dot: 'bg-purple-500' },
  { status: 'ready', label: 'Ready', dot: 'bg-cyan-500' },
  { status: 'completed', label: 'Completed', dot: 'bg-green-500' },
  { status: 'rejected', label: 'Rejected', dot: 'bg-red-500' },
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const detailRef = useRevealOnSmallScreen<HTMLDivElement>(selectedId ?? undefined);

  useEffect(() => {
    const refresh = () => { fetchRequests().then(list => setRequests(list.map(toRow))); };
    refresh();
    return subscribeRequests(refresh);
  }, []);

  const selectedReq = requests.find(r => r.id === selectedId) ?? null;

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
      setError('');
      setRejecting(true);
      return;
    }
    void updateStatus(row, status);
  };

  const next = selectedReq ? NEXT_STEP[selectedReq.status] : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Manage Requests
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click a request to see its details and update its status.
        </p>
      </div>

      {/* Search + filters */}
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

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* List */}
        <div className={`${selectedReq ? 'lg:col-span-3' : 'lg:col-span-5'} bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden`}>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && <span className="text-gray-400"> · {STATUS_LABEL[statusFilter]}</span>}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No requests found matching your filters.
            </div>
          )}

          {/* Phone: cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map(req => (
              <button
                key={req.id}
                type="button"
                onClick={() => select(req.id)}
                className={`w-full text-left px-4 py-4 transition-colors ${
                  selectedId === req.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'active:bg-gray-50 dark:active:bg-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{req.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{req.student}</p>
                  </div>
                  <StatusBadge status={req.status} label={STATUS_LABEL[req.status]} />
                </div>
                <div className="flex items-center justify-between gap-3 mt-2 text-xs">
                  <span className="font-mono text-blue-600 dark:text-blue-400 break-all">{req.id}</span>
                  <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{req.submitted}</span>
                </div>
                {req.pickup && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400">
                    <CalendarClock className="w-3.5 h-3.5" /> Pickup: {req.pickup}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Tablet & desktop: table */}
          {filtered.length > 0 && (
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-5 py-3">Request</th>
                    <th className="px-5 py-3">Student</th>
                    <th className={`px-5 py-3 ${selectedReq ? 'hidden' : 'hidden md:table-cell'}`}>Payment</th>
                    <th className={`px-5 py-3 ${selectedReq ? 'hidden' : 'hidden xl:table-cell'}`}>Submitted</th>
                    <th className={`px-5 py-3 ${selectedReq ? 'hidden' : 'hidden lg:table-cell'}`}>Pickup</th>
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
                        <td className={`px-5 py-3.5 align-top ${selectedReq ? 'hidden' : 'hidden md:table-cell'}`}>
                          <span className={`text-sm font-medium ${paymentTone(req.paymentStatus)}`}>{req.payment}</span>
                        </td>
                        <td className={`px-5 py-3.5 align-top ${selectedReq ? 'hidden' : 'hidden xl:table-cell'}`}>
                          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{req.submitted}</span>
                        </td>
                        <td className={`px-5 py-3.5 align-top ${selectedReq ? 'hidden' : 'hidden lg:table-cell'}`}>
                          {req.pickup
                            ? <span className="text-sm font-medium text-cyan-700 dark:text-cyan-400 whitespace-nowrap">{req.pickup}</span>
                            : <span className="text-sm text-gray-400">Not booked</span>}
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

        {/* Detail panel */}
        {selectedReq && (
          <div ref={detailRef} className="lg:col-span-2 lg:sticky lg:top-6 space-y-4 scroll-mt-16">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">{selectedReq.id}</p>
                  <h3 className="font-semibold text-gray-900 dark:text-white leading-snug mt-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {selectedReq.type}
                  </h3>
                  <div className="mt-2">
                    <StatusBadge status={selectedReq.status} label={STATUS_LABEL[selectedReq.status]} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4">
                <Field label="Student" value={selectedReq.student} />
                <Field label="Student ID" value={selectedReq.studentId} mono />
                <Field label="Submitted" value={selectedReq.submitted} />
                <Field label="Payment" value={selectedReq.payment} tone={paymentTone(selectedReq.paymentStatus)} />
                <Field label="Purpose" value={selectedReq.purpose} wide />
              </dl>

              <div className={`mx-5 mb-4 p-3 rounded-xl border flex items-start gap-2.5 ${
                selectedReq.pickup
                  ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/15 dark:border-cyan-800/60'
                  : 'bg-gray-50 border-gray-200 dark:bg-slate-900/40 dark:border-slate-700'
              }`}>
                <CalendarClock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedReq.pickup ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pickup booked by student</p>
                  <p className={`text-sm font-semibold mt-0.5 ${selectedReq.pickup ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {selectedReq.pickupLong || 'Not booked yet'}
                  </p>
                </div>
              </div>

              {selectedReq.status === 'rejected' && (
                <RejectionNotice
                  compact
                  className="mx-5 mb-4"
                  title="Rejected · sent to student"
                  text={selectedReq.rejectionReason}
                  fallback="No reason recorded."
                />
              )}

              {selectedReq.notes && (
                <div className="mx-5 mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2">
                  <StickyNote className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed break-words">{selectedReq.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Update Status
              </h3>

              {error && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {next && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedReq, next.status)}
                    disabled={saving !== null}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-60"
                  >
                    {saving === next.status ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {next.label}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center">{next.hint}</p>
                </div>
              )}

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                {next ? 'Or set status to' : 'Set status to'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {ALL_ACTIONS.map(action => {
                  const current = selectedReq.status === action.status;
                  return (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => chooseStatus(selectedReq, action.status)}
                      disabled={current || saving !== null}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        current
                          ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-default'
                          : action.status === 'rejected'
                            ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-50'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700 disabled:opacity-50'
                      }`}
                    >
                      {saving === action.status ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : current ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <span className={`w-2 h-2 rounded-full ${action.dot}`} />
                      )}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <RejectReasonDialog
        open={rejecting && Boolean(selectedReq)}
        title="Reject this request?"
        subject={selectedReq ? `${selectedReq.type} (${selectedReq.id}) · ${selectedReq.student}` : ''}
        reasons={REQUEST_REJECT_REASONS}
        busy={saving === 'rejected'}
        error={rejecting ? error : ''}
        onCancel={() => setRejecting(false)}
        onConfirm={reason => { if (selectedReq) void updateStatus(selectedReq, 'rejected', reason); }}
      />
    </div>
  );
}

function Field({ label, value, mono, wide, tone }: { label: string; value: string; mono?: boolean; wide?: boolean; tone?: string }) {
  return (
    <div className={wide ? 'col-span-2' : 'min-w-0'}>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 break-words leading-snug ${tone || 'text-gray-900 dark:text-white'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
