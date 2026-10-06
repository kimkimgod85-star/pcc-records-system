import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  FileText, CreditCard, Calendar, Banknote, Users, BarChart3,
  ArrowRight, LayoutDashboard, ShieldCheck, Lightbulb,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { withBase } from '../../lib/basePath';

const SKIP_KEY = 'pcc-skip-admin-welcome';

export function adminHome(userId: string) {
  try {
    return localStorage.getItem(`${SKIP_KEY}:${userId}`) === '1' ? '/admin' : '/admin/welcome';
  } catch {
    return '/admin/welcome';
  }
}

const workflow = [
  {
    icon: FileText,
    title: 'Review new requests',
    desc: 'Open Manage Requests. Check the student, document, and purpose, then Approve or Reject. Move approved requests to Processing, then Ready for Pickup.',
    href: '/admin/requests',
    action: 'Manage Requests',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: CreditCard,
    title: 'Verify payments',
    desc: 'Open Payments. Compare the GCash screenshot or the cashier Official Receipt photo with the reference / OR number and amount, then Verify or Reject.',
    href: '/admin/payments',
    action: 'Payments',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    icon: Calendar,
    title: 'Manage pickup schedules',
    desc: 'Open Scheduling to open or close pickup dates, set time slots, and limit how many students can claim per slot and per day. Students can only book what you open.',
    href: '/admin/scheduling',
    action: 'Scheduling',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: Banknote,
    title: 'Update document fees',
    desc: 'Open Document Fees to change prices, add or hide documents, and set the rush fee. Click Save changes, and students are notified automatically.',
    href: '/admin/documents',
    action: 'Document Fees',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    icon: Users,
    title: 'Manage users',
    desc: 'Open Users to look up students and alumni, see how many requests they made, and deactivate accounts that should no longer have access.',
    href: '/admin/users',
    action: 'Users',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: BarChart3,
    title: 'Check reports',
    desc: 'Open Reports for request counts, completed documents, and collected fees by semester or month. Set the class dates for the school year first.',
    href: '/admin/reports',
    action: 'Reports',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
  },
];

const reminders = [
  'Verify payment before moving a request to Processing.',
  'Students get a notification every time you change a request or payment status.',
  'Check that the OR number and amount on the receipt photo match before verifying.',
  'Office hours shown to students: Monday – Saturday, 8:00 AM – 4:00 PM. Closed Sunday.',
];

const flow: { label: string; who: 'Student' | 'You' }[] = [
  { label: 'Submits a request', who: 'Student' },
  { label: 'Approve or reject', who: 'You' },
  { label: 'Pays online or at cashier', who: 'Student' },
  { label: 'Verify the payment', who: 'You' },
  { label: 'Prepare the document', who: 'You' },
  { label: 'Mark Ready for Pickup', who: 'You' },
  { label: 'Books a pickup & claims', who: 'Student' },
  { label: 'Mark Completed', who: 'You' },
];

function SectionTitle({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-semibold flex items-center justify-center flex-shrink-0">
        {step}
      </span>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.125rem' }}>
          {title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AdminWelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dontShow, setDontShow] = useState(() => (user ? adminHome(user.id) === '/admin' : false));

  const saveChoice = () => {
    if (!user) return;
    try {
      if (dontShow) localStorage.setItem(`${SKIP_KEY}:${user.id}`, '1');
      else localStorage.removeItem(`${SKIP_KEY}:${user.id}`);
    } catch {
      /* ignore */
    }
  };

  const goToDashboard = () => {
    saveChoice();
    navigate('/admin');
  };

  const firstName = user?.name?.split(' ')[0] || 'Registrar';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 dark:from-blue-800 dark:via-blue-900 dark:to-slate-900 rounded-2xl p-6 sm:p-8 mb-8 text-white overflow-hidden relative">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute right-24 -bottom-20 w-40 h-40 bg-sky-400/10 rounded-full" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/95 p-2 shadow-lg flex items-center justify-center flex-shrink-0">
              <img src={withBase('PCC%20LOGO.png')} alt="PCC logo" className="max-h-full w-auto object-contain" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/20 text-blue-100 text-xs font-medium mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Registrar Portal · Admin Guide
              </span>
              <h1 className="text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.75rem', fontWeight: 600 }}>
                Welcome, {firstName}!
              </h1>
              <p className="text-blue-100 text-sm mt-1.5 max-w-xl leading-relaxed">
                A quick guide to handling student record requests, from the first submission to the final claim.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToDashboard}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white text-blue-700 hover:bg-blue-50 shadow-sm transition-colors flex-shrink-0 active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Request flow */}
      <section className="mb-8">
        <SectionTitle step="1" title="How a request moves" subtitle="Every request follows these steps. The ones marked “You” are your job." />
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {flow.map((stage, i) => (
            <li
              key={stage.label}
              className="relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex items-start gap-3"
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                stage.who === 'You'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{stage.label}</p>
                <span className={`inline-block mt-1 text-xs font-medium ${
                  stage.who === 'You' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {stage.who}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Menus */}
      <section className="mb-8">
        <SectionTitle step="2" title="What each menu does" subtitle="Click a card to open that page." />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflow.map(item => (
            <Link
              key={item.title}
              to={item.href}
              onClick={saveChoice}
              className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">{item.desc}</p>
              <span className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 inline-flex items-center justify-between text-sm font-medium text-blue-600 dark:text-blue-400">
                Open {item.action}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Reminders */}
      <section className="mb-8">
        <SectionTitle step="3" title="Reminders" subtitle="Keep these in mind while working." />
        <div className="bg-amber-50 dark:bg-amber-900/15 rounded-2xl border border-amber-200 dark:border-amber-800/60 divide-y divide-amber-200/70 dark:divide-amber-800/40">
          {reminders.map(tip => (
            <div key={tip} className="flex items-start gap-3 px-5 py-3.5">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={e => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Don’t show this guide again after login
        </label>
        <button
          type="button"
          onClick={goToDashboard}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
