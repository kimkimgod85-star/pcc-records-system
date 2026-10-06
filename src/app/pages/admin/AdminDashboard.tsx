import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Clock, Calendar, CreditCard } from 'lucide-react';
import { Link } from 'react-router';
import { fetchRequests, subscribeRequests } from '../../lib/requests';
import { fetchPayments, subscribePayments } from '../../lib/payments';
import { fetchManagedUsers, subscribeUsers } from '../../lib/profiles';
import { loadSchedule, subscribeSchedule, todayISO } from '../../lib/scheduling';
import { formatShortDate, type RequestStatus } from '../../lib/status';
import { StatusBadge } from '../../components/StatusBadge';

const PIE_COLORS = ['#2563EB', '#16A34A', '#9333EA', '#EA580C', '#0891B2'];

const StatCard = ({ icon: Icon, label, value, sub, color, bg }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; bg: string;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <div className="flex items-center justify-between sm:block">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="sm:hidden text-2xl font-semibold text-gray-900 dark:text-white leading-none tabular-nums" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {value}
      </p>
    </div>
    <div className="min-w-0">
      <p className="hidden sm:block text-2xl font-semibold text-gray-900 dark:text-white leading-none tabular-nums" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {value}
      </p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 sm:mt-1.5 leading-snug">{label}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function AdminDashboard() {
  const [totalRequests, setTotalRequests] = useState(0);
  const [pending, setPending] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [users, setUsers] = useState(0);
  const [processing, setProcessing] = useState(0);
  const [scheduledToday, setScheduledToday] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [monthly, setMonthly] = useState<{ month: string; requests: number; completed: number }[]>([]);
  const [docTypes, setDocTypes] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recent, setRecent] = useState<{ id: string; name: string; type: string; status: RequestStatus; date: string }[]>([]);

  useEffect(() => {
    const refresh = () => {
      Promise.all([fetchRequests(), fetchPayments(), fetchManagedUsers(), loadSchedule()]).then(([requests, payments, managed, schedule]) => {
      setTotalRequests(requests.length);
      setPending(requests.filter(r => r.status === 'pending').length);
      setCompleted(requests.filter(r => r.status === 'completed').length);
      setProcessing(requests.filter(r => r.status === 'processing').length);
      setRejected(requests.filter(r => r.status === 'rejected').length);
      setUsers(managed.length);
      setPendingPayments(payments.filter(p => p.status === 'pending').length);
      setScheduledToday(schedule.bookings.filter(b => b.date === todayISO()).length);
      const monthMap = new Map<string, { month: string; requests: number; completed: number }>();
      requests.forEach(item => {
        const key = item.createdAt.slice(0, 7);
        const label = formatShortDate(`${key}-01`).replace(/\s\d+,/, '');
        if (!monthMap.has(key)) monthMap.set(key, { month: label, requests: 0, completed: 0 });
        const row = monthMap.get(key)!;
        row.requests += 1;
        if (item.status === 'completed') row.completed += 1;
      });
      setMonthly(Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, value]) => value));
      const typeMap = new Map<string, number>();
      requests.forEach(item => typeMap.set(item.type, (typeMap.get(item.type) || 0) + 1));
      setDocTypes(Array.from(typeMap.entries()).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] })));
      setRecent(requests.slice(0, 8).map(item => ({
        id: item.id,
        name: item.studentName,
        type: item.type,
        status: item.status,
        date: formatShortDate(item.createdAt),
      })));
      });
    };
    refresh();
    const stops = [subscribeRequests(refresh), subscribePayments(refresh), subscribeUsers(refresh), subscribeSchedule(refresh)];
    return () => stops.forEach(stop => stop());
  }, []);
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Live overview of requests, payments, and pickups.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Clock} label="Pending Review" value={pending} sub="Needs your action" color="text-orange-500" bg="bg-orange-100 dark:bg-orange-900/30" />
        <StatCard icon={CreditCard} label="Payments to Verify" value={pendingPayments} sub="Receipts submitted" color="text-yellow-600" bg="bg-yellow-100 dark:bg-yellow-900/30" />
        <StatCard icon={Calendar} label="Pickups Today" value={scheduledToday} sub="Scheduled claims" color="text-indigo-500" bg="bg-indigo-100 dark:bg-indigo-900/30" />
        <StatCard icon={Users} label="Registered Users" value={users} sub="Students & alumni" color="text-purple-500" bg="bg-purple-100 dark:bg-purple-900/30" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-5 py-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums mr-1.5">{totalRequests}</span>
          total requests
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="processing" label={`Processing · ${processing}`} />
          <StatusBadge status="completed" label={`Completed · ${completed}`} />
          <StatusBadge status="rejected" label={`Rejected · ${rejected}`} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Monthly Request Trends
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="requests" name="Submitted" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-600" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-600" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
            </div>
          </div>
        </div>

        {/* Document Types Pie */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            By Document Type
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={docTypes}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {docTypes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {docTypes.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Recent Requests
          </h2>
          <Link to="/admin/requests" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </Link>
        </div>
        <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
          {recent.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No requests yet.</p>
          )}
          {recent.map(req => (
            <Link key={req.id} to="/admin/requests" className="block px-5 py-4 active:bg-gray-50 dark:active:bg-slate-700/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{req.name.charAt(0)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{req.name}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{req.type}</p>
              <div className="flex items-center justify-between gap-3 mt-1 text-xs">
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">{req.id}</span>
                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{req.date}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-3 text-left font-medium">Request ID</th>
                <th className="px-6 py-3 text-left font-medium">Student</th>
                <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Document</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {recent.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{req.id}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{req.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{req.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 hidden sm:table-cell">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{req.type}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{req.date}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
