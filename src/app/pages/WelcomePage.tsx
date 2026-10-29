import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  FileText, CreditCard, Calendar, TrendingUp, Package,
  ArrowRight, LayoutDashboard, MessageSquare, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { withBase } from '../lib/basePath';
import { BlueCover } from '../components/BlueCover';

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
    desc: 'Choose a minor or major document and submit the form. The Registrar reviews it before you pay.',
    href: '/request',
    action: 'Request Record',
  },
  {
    icon: CreditCard,
    title: 'Pay the fee',
    desc: 'Pay by GCash and upload the screenshot, or pay in person. Save the REQ ID, pay at the cashier, then show the receipt and REQ ID.',
    href: '/payment',
    action: 'Payments',
  },
  {
    icon: TrendingUp,
    title: 'Track the request',
    desc: 'Follow Pending, Approved, Processing, and Ready for Pickup. Processing starts after payment is verified.',
    href: '/track',
    action: 'Track Request',
  },
  {
    icon: Calendar,
    title: 'Book a pickup',
    desc: 'When the document is ready, choose an open date and time at the Registrar’s Office.',
    href: '/schedule',
    action: 'Schedule Pickup',
  },
  {
    icon: Package,
    title: 'Claim it',
    desc: 'Bring a valid ID on your date. Major documents also need completed school clearances.',
    href: '',
    action: '',
  },
  {
    icon: MessageSquare,
    title: 'Message the office',
    desc: 'Use Messages to write the Registrar’s Office. Staff share one inbox. You can edit or delete your own messages.',
    href: '/messages',
    action: 'Messages',
  },
];

const notes = [
  { title: 'Minor documents', text: 'About 1 business day when the office is not busy.' },
  { title: 'Major documents', text: 'About 5 business days. It can take longer if the office is busy.' },
  { title: 'Pay in person', text: 'No receipt photo. Show your REQ ID at the cashier, then the receipt and REQ ID at the Registrar.' },
  { title: 'GCash', text: 'Upload a clear screenshot. The reference number must be readable.' },
  { title: 'Profile photo', text: 'Add a circle photo from the dashboard. Pinch to zoom and center your face.' },
  { title: 'Office hours', text: 'Monday to Saturday, 8:00 AM – 4:00 PM. Closed on Sunday.' },
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
      <BlueCover className="p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img src={withBase('PCC%20LOGO.png')} alt="PCC logo" className="h-20 w-auto object-contain drop-shadow" />
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
      </BlueCover>

      <h2 className="font-semibold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        How it works
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Six equal steps. Read one card, then open the page.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-stretch">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="h-full min-h-[15.5rem] bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-400">Step {i + 1}</span>
            </div>
            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1">{step.desc}</p>
            {step.href ? (
              <Link to={step.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
                {step.action} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-400">
                <Clock className="w-3.5 h-3.5" /> At the office
              </span>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        Good to know
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Short notes so the rules are easy to scan.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-stretch">
        {notes.map(note => (
          <div key={note.title} className="h-full min-h-[7.5rem] rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{note.title}</p>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{note.text}</p>
          </div>
        ))}
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
