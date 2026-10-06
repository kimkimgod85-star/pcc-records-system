import { useEffect, useState } from 'react';
import {
  Search, CheckCircle, XCircle, X, Smartphone, MapPin, ChevronRight, Loader2,
  AlertCircle, Wallet, Clock, Receipt, RotateCcw, ImageOff, ExternalLink,
} from 'lucide-react';
import { fetchPayments, screenshotUrl, subscribePayments, updatePaymentStatus, type PaymentRecord } from '../../lib/payments';
import { useRevealOnSmallScreen } from '../../lib/useRevealOnSmallScreen';

type PayStatus = PaymentRecord['status'];

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
      <span className="w-6 h-6 rounded-md bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
        <MapPin className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      </span>
      Cashier
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
  const detailRef = useRevealOnSmallScreen<HTMLDivElement>(selectedId ?? undefined);

  useEffect(() => {
    fetchPayments().then(setPayments);
    return subscribePayments(() => { fetchPayments().then(setPayments); });
  }, []);

  const selected = payments.find(p => p.id === selectedId) ?? null;

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

  const select = (id: string) => {
    setSelectedId(id);
    setError('');
  };

  const updateStatus = async (row: PaymentRecord, status: PayStatus) => {
    setSaving(status);
    setError('');
    try {
      await updatePaymentStatus(row.uuid, status, row.requestUuid, row.userId);
      setPayments(prev => prev.map(p => p.id === row.id ? { ...p, status } : p));
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
          Check each GCash screenshot or cashier receipt, then verify or reject it.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <SummaryCard icon={Clock} label="Waiting to verify" value={String(pendingCount)} tone="orange" onClick={() => setFilter('pending')} />
        <SummaryCard icon={Wallet} label="Total collected" value={peso(totalCollected)} tone="green" onClick={() => setFilter('verified')} />
        <SummaryCard icon={Receipt} label="All transactions" value={String(payments.length)} tone="blue" onClick={() => setFilter('all')} />
      </div>

      {/* Search + filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3 sm:p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student, request ID, or reference / OR number"
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

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* List */}
        <div className={`${selected ? 'lg:col-span-3' : 'lg:col-span-5'} bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden`}>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
              {filter !== 'all' && <span className="text-gray-400"> · {STATUS[filter].label}</span>}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No payments found.</div>
          )}

          {/* Phone: cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map(pay => (
              <button
                key={pay.id}
                type="button"
                onClick={() => select(pay.id)}
                className={`w-full text-left px-4 py-4 transition-colors ${
                  selectedId === pay.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'active:bg-gray-50 dark:active:bg-slate-700/50'
                }`}
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

          {/* Tablet & desktop: table */}
          {filtered.length > 0 && (
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-5 py-3">Student</th>
                    <th className={`px-5 py-3 ${selected ? 'hidden' : 'hidden md:table-cell'}`}>Method</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className={`px-5 py-3 ${selected ? 'hidden' : 'hidden xl:table-cell'}`}>Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filtered.map(pay => {
                    const active = selectedId === pay.id;
                    return (
                      <tr
                        key={pay.id}
                        onClick={() => select(pay.id)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <td className="px-5 py-3.5 align-top">
                          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{pay.student}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{pay.document}</p>
                          <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{pay.reqId}</p>
                        </td>
                        <td className={`px-5 py-3.5 align-top ${selected ? 'hidden' : 'hidden md:table-cell'}`}>
                          <MethodTag method={pay.method} />
                        </td>
                        <td className="px-5 py-3.5 align-top text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">{pay.amount}</span>
                        </td>
                        <td className={`px-5 py-3.5 align-top ${selected ? 'hidden' : 'hidden xl:table-cell'}`}>
                          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{pay.date}</span>
                        </td>
                        <td className="px-5 py-3.5 align-top">
                          <PayBadge status={pay.status} />
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
        {selected && (
          <div ref={detailRef} className="lg:col-span-2 lg:sticky lg:top-6 space-y-4 scroll-mt-16">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount paid</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {selected.amount}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <PayBadge status={selected.status} />
                    <MethodTag method={selected.method} />
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

              {/* Proof */}
              <div className="px-5 pt-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {selected.method === 'gcash' ? 'GCash screenshot' : 'Cashier official receipt'}
                </p>
                {screenshotUrl(selected.screenshotPath) ? (
                  <a
                    href={selected.screenshotPath}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
                  >
                    <img
                      src={selected.screenshotPath}
                      alt={selected.method === 'gcash' ? 'GCash proof' : 'Official receipt'}
                      className="w-full max-h-72 object-contain"
                    />
                    <span className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                      <ExternalLink className="w-3.5 h-3.5" /> Open full size
                    </span>
                  </a>
                ) : (
                  <div className="h-28 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <ImageOff className="w-5 h-5" />
                    <p className="text-sm">{selected.method === 'cashier' ? 'No receipt photo uploaded' : 'No screenshot uploaded'}</p>
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4">
                <Field label={selected.method === 'gcash' ? 'GCash ref no.' : 'OR number'} value={selected.refNo || '—'} mono highlight />
                <Field label="Date" value={selected.date} />
                <Field label="Student" value={selected.student} />
                <Field label="Request ID" value={selected.reqId} mono />
                <Field label="Document" value={selected.document} wide />
              </dl>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Decision
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
                Make sure the amount and {selected.method === 'gcash' ? 'reference number' : 'OR number'} match the photo.
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
                  {selected.status === 'verified' ? 'Verified' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(selected, 'rejected')}
                  disabled={selected.status === 'rejected' || saving !== null}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    selected.status === 'rejected'
                      ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800 cursor-default'
                      : 'border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60'
                  }`}
                >
                  {saving === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {selected.status === 'rejected' ? 'Rejected' : 'Reject'}
                </button>
              </div>
              {selected.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selected, 'pending')}
                  disabled={saving !== null}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-60"
                >
                  {saving === 'pending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Move back to “To Verify”
                </button>
              )}
            </div>
          </div>
        )}
      </div>
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
