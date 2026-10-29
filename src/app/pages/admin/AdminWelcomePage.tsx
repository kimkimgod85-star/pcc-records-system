import { btn } from '../../lib/ui';
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
    desc: 'Check the student, document, and purpose. Approve or reject. Move it to Processing only after payment is verified, then Ready for Pickup.',
    href: '/admin/requests',
    action: 'Manage Requests',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: CreditCard,
    title: 'Verify payments',
    desc: 'GCash: check the screenshot and reference number. Pay in person: wait for the student, then match the official receipt with the REQ ID.',
    href: '/admin/payments',
    action: 'Payments',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    icon: Calendar,
    title: 'Manage pickup schedules',
    desc: 'Open or close dates, set time slots, and set daily limits. If a pickup date passes, reschedule it and the student is notified.',
    href: '/admin/scheduling',
    action: 'Scheduling',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: Banknote,
    title: 'Update document fees',
    desc: 'Change prices, add or hide documents, and mark each one Minor or Major. Save changes. Students are notified.',
    href: '/admin/documents',
    action: 'Document Fees',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    icon: Users,
    title: 'Manage users',
    desc: 'See each student’s photo and requests. Message them, or deactivate an account. Students register themselves.',
    href: '/admin/users',
    action: 'Users',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: BarChart3,
    title: 'Check reports',
    desc: 'See request counts, completed documents, and fees. Set the school-year dates here. Reset records only from this page.',
    href: '/admin/reports',
    action: 'Reports',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
  },
];

const reminders = [
  { title: 'Payment first', text: 'Verify the payment before you move a request to Processing.' },
  { title: 'Pay in person', text: 'The list says the student must verify in person. Match the official receipt and REQ ID. There is no receipt photo.' },
  { title: 'Messages', text: 'All staff share one inbox. You can edit your own message, or delete the whole chat.' },
  { title: 'Timing', text: 'Minor documents are about 1 business day. Major documents are about 5, longer if the office is busy.' },
  { title: 'Missed pickup', text: 'If the booked date passes and the document is not ready, the student is notified. You can reschedule it.' },
  { title: 'Office hours', text: 'Monday to Saturday, 8:00 AM – 4:00 PM. Closed on Sunday.' },
];

const flow: { label: string; who: 'Student' | 'You' }[] = [
  { label: 'Submits a request', who: 'Student' },
  { label: 'Approve or reject', who: 'You' },
  { label: 'Pays via GCash or Pay in Person', who: 'Student' },
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
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          {flow.map((stage, i) => (
            <li
              key={stage.label}
              className="h-full min-h-[6.25rem] bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex items-start gap-3"
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
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {workflow.map(item => (
            <Link
              key={item.title}
              to={item.href}
              onClick={saveChoice}
              className="group h-full min-h-[14.5rem] bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col hover:border-blue-200 dark:hover:border-blue-800"
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {reminders.map(tip => (
            <div key={tip.title} className="h-full min-h-[8.5rem] rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{tip.title}</p>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{tip.text}</p>
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
          className={btn('primary', 'lg')}
        >
          <LayoutDashboard className="w-4 h-4" />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
