import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Bell, Clock, CheckCircle, Package, Loader,
  ArrowRight, Plus, CreditCard, Wallet, AlertCircle, HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchRequests, subscribeRequests, type StudentRequest } from '../lib/requests';
import { fetchNotifications, subscribeNotifications } from '../lib/notifications';
import { formatLongDate, paymentLabel } from '../lib/status';
import { StatusBadge } from '../components/StatusBadge';
import { DeviceNotificationBanner } from '../components/DeviceNotificationPrompt';
import { InstallAppBanner } from '../components/InstallApp';

type PaymentStatus = 'unpaid' | 'pay_later' | 'paid' | 'verifying' | 'awaiting' | 'none';

const PAY_TEXT: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pay_later: 'Pay later',
  paid: 'Paid',
  verifying: 'Verifying',
  awaiting: 'Awaiting approval',
  none: '—',
};

const PAY_COLOR: Record<PaymentStatus, string> = {
  unpaid: 'text-orange-500 dark:text-orange-400',
  pay_later: 'text-gray-500 dark:text-gray-400',
  paid: 'text-green-600 dark:text-green-400',
  verifying: 'text-blue-600 dark:text-blue-400',
  awaiting: 'text-blue-600 dark:text-blue-400',
  none: 'text-gray-400',
};

function dashboardPayment(r: StudentRequest): PaymentStatus {
  if (r.paymentStatus === 'verified') return 'paid';
  if (r.paymentStatus === 'pending') return 'verifying';
  if (r.status === 'rejected' || r.status === 'completed') return 'none';
  if (r.status === 'pending') return 'awaiting';
  return r.paymentStatus === 'pay_later' ? 'pay_later' : 'unpaid';
}

const peso = (amount: number) => `₱${amount.toFixed(2)}`;

const TONES = {
  orange: { icon: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-50 ring-orange-600/15 dark:bg-orange-500/10 dark:ring-orange-400/20' },
  blue: { icon: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 ring-blue-600/15 dark:bg-blue-500/10 dark:ring-blue-400/20' },
  cyan: { icon: 'text-cyan-600 dark:text-cyan-300', bg: 'bg-cyan-50 ring-cyan-600/15 dark:bg-cyan-500/10 dark:ring-cyan-400/20' },
  green: { icon: 'text-green-600 dark:text-green-300', bg: 'bg-green-50 ring-green-600/15 dark:bg-green-500/10 dark:ring-green-400/20' },
};

const StatCard = ({ icon: Icon, label, hint, count, tone }: {
  icon: LucideIcon; label: string; hint: string; count: number; tone: keyof typeof TONES;
}) => (
  <Link
    to="/track"
    className="bg-white dark:bg-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
  >
    <div className="flex items-center justify-between sm:block">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ring-1 ring-inset flex items-center justify-center flex-shrink-0 ${TONES[tone].bg}`}>
        <Icon className={`w-5 h-5 ${TONES[tone].icon}`} />
      </div>
      <p className="sm:hidden text-2xl font-semibold text-gray-900 dark:text-white leading-none tabular-nums" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {count}
      </p>
    </div>
    <div className="min-w-0">
      <p className="hidden sm:block text-2xl font-semibold text-gray-900 dark:text-white leading-none tabular-nums" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {count}
      </p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 sm:mt-1.5 leading-snug">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{hint}</p>
    </div>
  </Link>
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [paymentTab, setPaymentTab] = useState<'to_pay' | 'paid' | 'all'>('to_pay');
  const [rawRequests, setRawRequests] = useState<StudentRequest[]>([]);
  const [alerts, setAlerts] = useState<{ msg: string; time: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      fetchRequests(user.id).then(setRawRequests);
      fetchNotifications(user.id).then(items => setAlerts(items.slice(0, 3).map(item => ({
        msg: item.message,
        time: item.createdAt,
      }))));
    };
    refresh();
    const stopRequests = subscribeRequests(refresh);
    const stopNotices = subscribeNotifications(refresh);
    return () => {
      stopRequests();
      stopNotices();
    };
  }, [user]);

  const requests = rawRequests.map(r => {
    const paymentStatus = dashboardPayment(r);
    return {
      id: r.id,
      type: r.type,
      submittedDate: formatLongDate(r.createdAt),
      rawStatus: r.status,
      pickupDate: formatLongDate(r.pickupDate),
      payment: paymentLabel(r.paymentStatus, r.paymentMethod),
      paymentStatus,
      paymentMethod: r.paymentMethod === 'gcash' ? 'GCash' : r.paymentMethod === 'cashier' ? 'Cashier' : r.paymentMethod,
      amount: r.amount,
      paymentColor: PAY_COLOR[paymentStatus],
    };
  });

  const statusCounts = {
    pending: rawRequests.filter(r => r.status === 'pending').length,
    inProgress: rawRequests.filter(r => r.status === 'approved' || r.status === 'processing').length,
    ready: rawRequests.filter(r => r.status === 'ready').length,
    completed: rawRequests.filter(r => r.status === 'completed').length,
    rejected: rawRequests.filter(r => r.status === 'rejected').length,
  };

  const unpaidRequests = requests.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'pay_later' || r.paymentStatus === 'awaiting');
  const dueRequests = requests.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'pay_later');
  const waitingCount = unpaidRequests.length - dueRequests.length;
  const paidRequests = requests.filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'verifying');
  const unpaidTotal = dueRequests.reduce((sum, r) => sum + r.amount, 0);
  const paidTotal = requests.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.amount, 0);
  const visiblePayments =
    paymentTab === 'to_pay' ? unpaidRequests :
    paymentTab === 'paid' ? paidRequests :
    requests.filter(r => r.paymentStatus !== 'none');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-2xl p-5 sm:p-6 mb-6 text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute right-8 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <p className="text-blue-200 text-sm mb-1">Good day,</p>
          <h1 className="text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
            {user?.name} 👋
          </h1>
          <p className="text-blue-100 text-sm">
            Student ID: {user?.studentId || 'N/A'} •{' '}
            <span className="capitalize">{user?.role}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/request"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors transition-transform active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              New Request
            </Link>
            <Link
              to="/welcome"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors border border-white/20 transition-transform active:scale-[0.98]"
            >
              <HelpCircle className="w-4 h-4" />
              How to Use
            </Link>
          </div>
        </div>
      </div>

      {user && <DeviceNotificationBanner userId={user.id} />}
      <InstallAppBanner className="mb-6" />

      {/* Request Status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Request Status
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {rawRequests.length === 0
              ? 'You have no requests yet.'
              : `Where your ${rawRequests.length} request${rawRequests.length === 1 ? ' is' : 's are'} right now.`}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100 dark:bg-slate-700">
          <StatCard icon={Clock} label="Pending Review" hint="Waiting for the registrar" count={statusCounts.pending} tone="orange" />
          <StatCard icon={Loader} label="In Progress" hint="Approved & being prepared" count={statusCounts.inProgress} tone="blue" />
          <StatCard icon={Package} label="Ready for Pickup" hint="Schedule your claim" count={statusCounts.ready} tone="cyan" />
          <StatCard icon={CheckCircle} label="Completed" hint="Already claimed" count={statusCounts.completed} tone="green" />
        </div>
        {statusCounts.rejected > 0 && (
          <Link
            to="/track"
            className="flex items-center gap-2 px-5 sm:px-6 py-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-t border-red-100 dark:border-red-500/20 hover:underline"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {statusCounts.rejected} request{statusCounts.rejected === 1 ? ' was' : 's were'} rejected. Open Track Request to see the reason.
          </Link>
        )}
      </div>

      {/* My Payments */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              My Payments
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Review what you already paid and what you still need to pay.
            </p>
          </div>
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
            {([
              { id: 'to_pay' as const, label: `To Pay (${unpaidRequests.length})` },
              { id: 'paid' as const, label: `Paid (${paidRequests.length})` },
              { id: 'all' as const, label: 'All' },
            ]).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentTab(tab.id)}
                className={`px-3 py-2 sm:py-1.5 rounded-lg text-sm sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                  paymentTab === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 sm:px-6 py-4 bg-orange-50/60 dark:bg-orange-950/10 border-b border-gray-100 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">Amount to pay</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400 break-words" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {peso(unpaidTotal)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">Already paid</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 break-words" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {peso(paidTotal)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:text-right">
            {dueRequests.length > 0 ? (
              <Link
                to="/payment"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              >
                <Wallet className="w-4 h-4" />
                Pay Unpaid Items
              </Link>
            ) : waitingCount > 0 ? (
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 pt-1">Waiting for approval before you can pay.</p>
            ) : (
              <p className="text-sm font-medium text-green-600 dark:text-green-400 pt-1">All payments are complete.</p>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-slate-700">
          {visiblePayments.length === 0 && (
            <p className="px-5 sm:px-6 py-8 text-sm text-center text-gray-500 dark:text-gray-400">
              No payments in this list.
            </p>
          )}
          {visiblePayments.map(req => {
            const isPaid = req.paymentStatus === 'paid';
            const isPayLater = req.paymentStatus === 'pay_later';
            const isVerifying = req.paymentStatus === 'verifying';
            const isAwaiting = req.paymentStatus === 'awaiting';
            return (
              <div key={req.id} className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{req.type}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                      isPaid
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : isVerifying || isAwaiting
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : isPayLater
                        ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {isPaid ? 'Paid' : isVerifying ? 'Verifying' : isAwaiting ? 'Awaiting approval' : isPayLater ? 'Pay later' : 'Due now'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{req.id}</p>
                  <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 mt-1 leading-snug">
                    {isPaid
                      ? `Paid via ${req.paymentMethod || 'online'} · ${req.submittedDate}`
                      : isVerifying
                      ? 'Payment received. Waiting for the Registrar to verify it.'
                      : isAwaiting
                      ? 'Don’t pay yet. Payment opens after the Registrar approves this request.'
                      : isPayLater
                      ? 'You can pay this later at the Cashier (PCC New Building), or pay online anytime.'
                      : 'Approved. Payment is required so processing can continue.'}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:flex-col sm:items-end">
                  <p className={`text-base font-bold ${isPaid ? 'text-green-600 dark:text-green-400' : isAwaiting ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {peso(req.amount)}
                  </p>
                  {isPaid || isVerifying || isAwaiting ? (
                    <Link
                      to="/track"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      View Request
                    </Link>
                  ) : (
                    <Link
                      to={`/payment?request=${req.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-w-[120px] rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay Now
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Requests Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              My Requests
            </h2>
            <Link to="/track" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-transform active:scale-[0.98]">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {requests.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No requests yet. Create one from Request Record.
              </p>
            )}
            {requests.map(req => (
              <Link key={req.id} to="/track" className="block px-5 py-4 active:bg-gray-50 dark:active:bg-slate-700/50">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{req.type}</p>
                  <StatusBadge status={req.rawStatus} />
                </div>
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-1 break-all">{req.id}</p>
                <div className="flex items-center justify-between gap-3 mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{req.submittedDate}</span>
                  <span className={`font-semibold ${req.paymentColor}`}>
                    {PAY_TEXT[req.paymentStatus]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-6 py-3 text-left font-medium">Request ID</th>
                  <th className="px-6 py-3 text-left font-medium">Document</th>
                  <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Date</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No requests yet. Create one from Request Record.
                    </td>
                  </tr>
                )}
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{req.id}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{req.type}</span>
                    </td>
                    <td className="px-6 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{req.submittedDate}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={req.rawStatus} />
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold whitespace-nowrap ${req.paymentColor}`}>
                        {PAY_TEXT[req.paymentStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Recent Alerts
              </h3>
              <Link to="/notifications" className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-transform active:scale-[0.98]">
                See all
              </Link>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No alerts yet.</p>
              )}
              {alerts.map((notif, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Bell className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                  <div>
                    <p className="text-sm sm:text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{notif.msg}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatLongDate(notif.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
