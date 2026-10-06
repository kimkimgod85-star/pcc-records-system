import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  FileText, CreditCard, Calendar, TrendingUp, Bell, Package,
  ArrowRight, Lightbulb, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SKIP_KEY = 'pcc-skip-welcome';

export function shouldShowWelcome(userId: string) {
  try {
    return localStorage.getItem(`${SKIP_KEY}:${userId}`) !== '1';
  } catch {
    return true;
  }
}

export function studentHome(userId: string) {
  return shouldShowWelcome(userId) ? '/welcome' : '/dashboard';
}

const steps = [
  {
    icon: FileText,
    title: 'Request a record',
    desc: 'Open Request Record, choose the document you need (TOR, certificate, diploma, and more), and submit the form.',
    href: '/request',
    action: 'Request Record',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: CreditCard,
    title: 'Pay the fee',
    desc: 'Pay through GCash and upload the screenshot, or pay at the Cashier and upload a photo of your official receipt.',
    href: '/payment',
    action: 'Payments',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    icon: TrendingUp,
    title: 'Track your request',
    desc: 'Watch your request move from Pending to Approved to Ready for Pickup. The registrar verifies your payment first.',
    href: '/track',
    action: 'Track Request',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: Calendar,
    title: 'Schedule your pickup',
    desc: 'Once your document is ready, pick an available date and time slot to claim it at the Registrar’s Office.',
    href: '/schedule',
    action: 'Schedule Pickup',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: Package,
    title: 'Claim your document',
    desc: 'Go to the Registrar’s Office on your schedule. Bring a valid school ID and your official receipt.',
    href: '',
    action: '',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
  },
];

const tips = [
  'Check Notifications often. You get alerts when your payment is verified or your document is ready.',
  'Make sure receipt and GCash photos are clear so the OR or reference number is readable.',
  'Cashier and Registrar hours: Monday – Saturday, 8:00 AM – 4:00 PM. Closed on Sunday.',
];

export default function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dontShow, setDontShow] = useState(() => (user ? !shouldShowWelcome(user.id) : false));

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
    navigate('/dashboard');
  };

  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-2xl p-6 sm:p-8 mb-6 text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute right-10 bottom-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <img src="/PCC%20LOGO.png" alt="PCC logo" className="h-16 w-auto object-contain drop-shadow" />
          <div>
            <p className="text-blue-200 text-sm mb-1">Welcome to PCC Records,</p>
            <h1 className="text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.75rem', fontWeight: 600 }}>
              Hi, {firstName}! 👋
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              Request your school records online without the long queue. Here’s a quick guide on how to use the system.
            </p>
          </div>
        </div>
      </div>

      <h2 className="font-semibold text-gray-900 dark:text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
        How it works
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.bg}`}>
                <step.icon className={`w-5 h-5 ${step.color}`} />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Step {i + 1}</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {step.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1">{step.desc}</p>
            {step.href && (
              <Link
                to={step.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {step.action} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ))}

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Tips</span>
          </div>
          <ul className="space-y-2">
            {tips.map(tip => (
              <li key={tip} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                <Bell className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-amber-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

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
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to="/request"
            onClick={saveChoice}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Make my first request
          </Link>
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
    </div>
  );
}
