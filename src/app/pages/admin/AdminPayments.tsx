import { useEffect, useState } from 'react';
import {
  Search, CheckCircle, XCircle, X, Smartphone, MapPin, ChevronRight, Loader2,
  AlertCircle, Wallet, Clock, Receipt, RotateCcw, ImageOff, ExternalLink, ArrowRight, UserRound,
} from 'lucide-react';
import { Link } from 'react-router';
import { fetchPayments, screenshotUrl, subscribePayments, updatePaymentStatus, type PaymentRecord } from '../../lib/payments';
import { subscribeRequests, updateRequestStatus } from '../../lib/requests';
import { REQUEST_STATUS_LABEL, type RequestStatus } from '../../lib/status';
import { StatusBadge } from '../../components/StatusBadge';
import { CASHIER_PAYMENT_REJECT_REASONS, PAYMENT_REJECT_REASONS, RejectReasonDialog } from '../../components/RejectReasonDialog';

type PayStatus = PaymentRecord['status'];

const AUTO_PROCESS_KEY = 'pcc-admin-auto-process';

const NEXT_REQUEST_STEP: Partial<Record<RequestStatus, { status: RequestStatus; label: string; hint: string }>> = {
  pending: { status: 'approved', label: 'Approve request', hint: 'The request is still pending review.' },
  approved: { status: 'processing', label: 'Start processing', hint: 'Payment is verified, so the document can be prepared.' },
  processing: { status: 'ready', label: 'Mark Ready for Pickup', hint: 'The student will be told to book or come for pickup.' },
  ready: { status: 'completed', label: 'Mark as Completed', hint: 'Use this once the student claims the document.' },
};

function readAutoProcess() {
  try {
    return localStorage.getItem(AUTO_PROCESS_KEY) !== 'off';
  } catch {
    return true;
  }
}

const STATUS: Record<PayStatus, { label: string; badge: string; dot: string }> = {
  pending: {
    label: 'To Verify',
    badge: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/30',
    dot: 'bg-orange-500',
  },
  verified: {
    label: 'Verified',
    badge: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/30',
    dot: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30',
    dot: 'bg-red-500',
  },
};

const FILTERS: { value: 'all' | PayStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'To Verify' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const peso = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function PayBadge({ status }: { status: PayStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ring-1 ring-inset ${STATUS[status].badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS[status].dot}`} />
      {STATUS[status].label}
    </span>
  );
}

function MethodTag({ method }: { method: PaymentRecord['method'] }) {
  return method === 'gcash' ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
      <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
        <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      </span>
      GCash
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
      <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <MapPin className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
      </span>
      Pay in Person
    </span>
  );
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | PayStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<PayStatus | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [autoProcess, setAutoProcess] = useState(readAutoProcess);
  const [advancing, setAdvancing] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => { fetchPayments().then(setPayments); };
    refresh();
    const stopPayments = subscribePayments(refresh);
    const stopRequests = subscribeRequests(refresh);
    return () => {
      stopPayments();
      stopRequests();
    };
  }, []);

  const selected = payments.find(p => p.id === selectedId) ?? null;
  const detailOpen = Boolean(selected);

  useEffect(() => {
    if (!detailOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [detailOpen]);

  useEffect(() => {
    if (!detailOpen || rejecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && saving === null && !advancing) {
        setSelectedId(null);
        setError('');
        setNotice('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailOpen, rejecting, saving, advancing]);

  const toggleAutoProcess = (on: boolean) => {
    setAutoProcess(on);
    try {
      localStorage.setItem(AUTO_PROCESS_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  };

  const setRequestStatus = (requestUuid: string, requestStatus: RequestStatus) =>
    setPayments(prev => prev.map(p => p.requestUuid === requestUuid ? { ...p, requestStatus } : p));

  const advanceRequest = async (row: PaymentRecord, next: RequestStatus) => {
    setAdvancing(true);
    setError('');
    setNotice('');
    try {
      await updateRequestStatus(row.requestUuid, next, row.userId, row.document, row.reqId);
      setRequestStatus(row.requestUuid, next);
      setNotice(`${row.reqId} is now “${REQUEST_STATUS_LABEL[next]}”. The student was notified.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the request. Please try again.');
    } finally {
      setAdvancing(false);
    }
  };

  const query = search.trim().toLowerCase();
  const searched = payments.filter(p =>
    !query ||
    p.reqId.toLowerCase().includes(query) ||
    p.id.toLowerCase().includes(query) ||
    p.student.toLowerCase().includes(query) ||
    p.refNo.toLowerCase().includes(query)
  );
  const filtered = filter === 'all' ? searched : searched.filter(p => p.status === filter);
  const countFor = (value: 'all' | PayStatus) =>
    value === 'all' ? searched.length : searched.filter(p => p.status === value).length;

  const totalCollected = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amountValue, 0);
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  const closeDetail = () => {
    if (saving !== null || advancing) return;
    setSelectedId(null);
    setError('');
    setNotice('');
  };

  const select = (id: string) => {
    setSelectedId(id);
    setError('');
    setNotice('');
  };

  const updateStatus = async (row: PaymentRecord, status: PayStatus, reason = '') => {
    setSaving(status);
    setError('');
    setNotice('');
    try {
      await updatePaymentStatus(row.uuid, status, row.requestUuid, row.userId, reason);
      setPayments(prev => prev.map(p => p.id === row.id ? { ...p, status } : p));
      setRejecting(false);
      if (status === 'verified') {
        if (autoProcess && row.requestStatus === 'approved') {
          await updateRequestStatus(row.requestUuid, 'processing', row.userId, row.document, row.reqId);
          setRequestStatus(row.requestUuid, 'processing');
          setNotice(`Payment verified and ${row.reqId} moved to “Processing”. The student was notified.`);
        } else {
          setNotice('Payment verified. The student was notified.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the payment. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Payment Verification
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click a payment to verify. GCash uses the screenshot; Pay in Person waits for the student in person.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <SummaryCard icon={Clock} label="Waiting to verify" value={String(pendingCount)} tone="orange" onClick={() => setFilter('pending')} />
        <SummaryCard icon={Wallet} label="Total collected" value={peso(totalCollected)} tone="green" onClick={() => setFilter('verified')} />
        <SummaryCard icon={Receipt} label="All transactions" value={String(payments.length)} tone="blue" onClick={() => setFilter('all')} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3 sm:p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student, request ID, GCash ref, or REQ ID"
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
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

      {/* Full-width list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && <span className="text-gray-400"> · {STATUS[filter].label}</span>}
          </span>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No payments found.</div>
        )}

        <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
          {filtered.map(pay => (
            <button
              key={pay.id}
              type="button"
              onClick={() => select(pay.id)}
              className="w-full text-left px-4 py-4 transition-colors active:bg-gray-50 dark:active:bg-slate-700/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{pay.student}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{pay.document}</p>
                </div>
                <PayBadge status={pay.status} />
              </div>
              <div className="flex items-center justify-between gap-3 mt-2.5">
                <MethodTag method={pay.method} />
                <span className="text-base font-semibold text-gray-900 dark:text-white tabular-nums">{pay.amount}</span>
              </div>
              <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-1.5 break-all">{pay.reqId}</p>
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3 hidden md:table-cell">Method</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 hidden xl:table-cell">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filtered.map(pay => (
                  <tr
                    key={pay.id}
                    onClick={() => select(pay.id)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-5 py-3.5 align-top">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{pay.student}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{pay.document}</p>
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{pay.reqId}</p>
                    </td>
                    <td className="px-5 py-3.5 align-top hidden md:table-cell">
                      <MethodTag method={pay.method} />
                    </td>
                    <td className="px-5 py-3.5 align-top text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">{pay.amount}</span>
                    </td>
                    <td className="px-5 py-3.5 align-top hidden xl:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{pay.date}</span>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <PayBadge status={pay.status} />
                    </td>
                    <td className="pr-4 py-3.5 align-top">
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Centered detail modal */}
      {selected && (
        <div
          className="fade-in fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
          onClick={closeDetail}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            onClick={e => e.stopPropagation()}
            className="pop-in w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
          >
            <div className="flex-shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount paid</p>
                <p
                  id="payment-detail-title"
                  className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums leading-tight"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {selected.amount}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <PayBadge status={selected.status} />
                  <MethodTag method={selected.method} />
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                disabled={saving !== null || advancing}
                aria-label="Close details"
                className="p-2 -m-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Decision first */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Decision</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
                {selected.method === 'gcash'
                  ? 'Match the amount and reference number with the screenshot.'
                  : selected.status === 'pending'
                  ? 'When the student arrives, check Official Receipt + REQ ID, then Verify.'
                  : 'Update the verification result for this Pay in Person payment.'}
              </p>

              {error && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(selected, 'verified')}
                  disabled={selected.status === 'verified' || saving !== null}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    selected.status === 'verified'
                      ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800 cursor-default'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-sm disabled:opacity-60'
                  }`}
                >
                  {saving === 'verified' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {selected.status === 'verified'
                    ? 'Verified'
                    : autoProcess && selected.requestStatus === 'approved' ? 'Verify & Process' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => { setError(''); setRejecting(true); }}
                  disabled={selected.status === 'rejected' || saving !== null}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    selected.status === 'rejected'
                      ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800 cursor-default'
                      : 'border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:bg-slate-800 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60'
                  }`}
                >
                  {saving === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {selected.status === 'rejected' ? 'Rejected' : 'Reject'}
                </button>
              </div>

              {selected.status === 'pending' && selected.requestStatus === 'approved' && (
                <label className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoProcess}
                    onChange={e => toggleAutoProcess(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                    Start processing right after verifying
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Moves {selected.reqId} to “Processing” in the same click.
                    </span>
                  </span>
                </label>
              )}

              {notice && (
                <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                  <p className="text-sm text-green-800 dark:text-green-200">{notice}</p>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {selected.method === 'gcash' ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">GCash screenshot</p>
                  {screenshotUrl(selected.screenshotPath) ? (
                    <a
                      href={selected.screenshotPath}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
                    >
                      <img
                        src={selected.screenshotPath}
                        alt="GCash proof"
                        className="w-full max-h-56 object-contain"
                      />
                      <span className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                        <ExternalLink className="w-3.5 h-3.5" /> Open full size
                      </span>
                    </a>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-600 px-4 py-5 flex flex-col items-center justify-center gap-1.5 text-center text-gray-500 dark:text-gray-400">
                      <ImageOff className="w-5 h-5" />
                      <p className="text-sm">No screenshot uploaded</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Pay in Person status</p>
                  <div className={`rounded-xl border px-4 py-4 ${
                    selected.status === 'verified'
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : selected.status === 'rejected'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selected.status === 'verified'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : selected.status === 'rejected'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                      }`}>
                        {selected.status === 'verified' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : selected.status === 'rejected' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <UserRound className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${
                          selected.status === 'verified'
                            ? 'text-green-900 dark:text-green-100'
                            : selected.status === 'rejected'
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-amber-950 dark:text-amber-100'
                        }`}>
                          {selected.status === 'verified'
                            ? 'Verified in person'
                            : selected.status === 'rejected'
                            ? 'Pay in Person rejected'
                            : 'Waiting for student to verify in person'}
                        </p>
                        <p className={`text-sm mt-1 leading-snug ${
                          selected.status === 'verified'
                            ? 'text-green-800 dark:text-green-200'
                            : selected.status === 'rejected'
                            ? 'text-red-800 dark:text-red-200'
                            : 'text-amber-900 dark:text-amber-200'
                        }`}>
                          {selected.status === 'verified'
                            ? 'Official Receipt and REQ ID were confirmed at the Registrar.'
                            : selected.status === 'rejected'
                            ? 'Ask the student to confirm Pay in Person again and return with a valid Official Receipt and REQ ID.'
                            : 'No receipt photo is uploaded in the app. Wait for the student to bring Official Receipt + REQ ID, then verify here.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <Field label={selected.method === 'gcash' ? 'GCash ref no.' : 'REQ ID'} value={selected.refNo || selected.reqId || '—'} mono highlight />
                <Field label="Date" value={selected.date} />
                <Field label="Student" value={selected.student} />
                <Field label="Request ID" value={selected.reqId} mono />
                <Field label="Document" value={selected.document} wide />
              </dl>

              {selected.status === 'verified' && (() => {
                const next = NEXT_REQUEST_STEP[selected.requestStatus];
                return (
                  <div className="pt-1 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3 mb-2 mt-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Request {selected.reqId}</p>
                      <StatusBadge status={selected.requestStatus} />
                    </div>
                    {next ? (
                      <>
                        <button
                          type="button"
                          onClick={() => advanceRequest(selected, next.status)}
                          disabled={advancing || saving !== null}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60"
                        >
                          {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                          {next.label}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{next.hint}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No further steps for this request.</p>
                    )}
                    <Link
                      to="/admin/requests"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Open in Manage Requests <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })()}

              {selected.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selected, 'pending')}
                  disabled={saving !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-60 py-2"
                >
                  {saving === 'pending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Move back to “To Verify”
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <RejectReasonDialog
        open={rejecting && Boolean(selected)}
        title="Reject this payment?"
        subject={selected ? `${selected.amount} · ${selected.document} (${selected.reqId}) · ${selected.student}` : ''}
        reasons={selected?.method === 'cashier' ? CASHIER_PAYMENT_REJECT_REASONS : PAYMENT_REJECT_REASONS}
        busy={saving === 'rejected'}
        error={rejecting ? error : ''}
        onCancel={() => setRejecting(false)}
        onConfirm={reason => { if (selected) void updateStatus(selected, 'rejected', reason); }}
      />
    </div>
  );
}

const TONE = {
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

function SummaryCard({ icon: Icon, label, value, tone, onClick }: {
  icon: typeof Clock; label: string; value: string; tone: keyof typeof TONE; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${TONE[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums break-words" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {value}
        </p>
      </div>
    </button>
  );
}

function Field({ label, value, mono, wide, highlight }: { label: string; value: string; mono?: boolean; wide?: boolean; highlight?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : 'min-w-0'}>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-sm mt-0.5 break-words leading-snug ${
        highlight ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-900 dark:text-white'
      } ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
