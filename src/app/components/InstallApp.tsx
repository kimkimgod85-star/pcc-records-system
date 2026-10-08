import { useState } from 'react';
import {
  BellRing, CheckCircle, Download, EllipsisVertical, Maximize2, MousePointerClick, PlusSquare, Share, Smartphone, X, Zap,
} from 'lucide-react';
import { useInstallApp, type InstallMode } from '../lib/installApp';
import { withBase } from '../lib/basePath';

const APP_ICON = withBase('favicon-192.png');
const DISMISS_KEY = 'pcc-install-dismissed';

const PERKS = [
  { icon: MousePointerClick, label: 'Opens in one tap' },
  { icon: BellRing, label: 'Instant notifications' },
  { icon: Maximize2, label: 'Full screen, like a real app' },
  { icon: Zap, label: 'Always up to date' },
];

function Steps({ mode, compact = false }: { mode: InstallMode; compact?: boolean }) {
  const steps = mode === 'ios'
    ? [
        { icon: Share, text: <>Tap the <strong>Share</strong> button in Safari</> },
        { icon: PlusSquare, text: <>Choose <strong>Add to Home Screen</strong></> },
        { icon: CheckCircle, text: <>Tap <strong>Add</strong>. Done!</> },
      ]
    : [
        { icon: EllipsisVertical, text: <>Open your browser menu <strong>(⋮)</strong></> },
        { icon: Download, text: <>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong></> },
        { icon: CheckCircle, text: <>Tap <strong>Install</strong>. Done!</> },
      ];
  return (
    <ol className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-3'}`}>
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-700">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <step.icon className="w-4 h-4 text-blue-700 dark:text-blue-300 flex-shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-200 leading-snug [&_strong]:text-gray-900 dark:[&_strong]:text-white">{step.text}</span>
        </li>
      ))}
    </ol>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[200px] sm:w-[220px]" aria-hidden="true">
      <div className="absolute -inset-6 bg-blue-500/20 dark:bg-blue-400/10 blur-3xl rounded-full" />
      <div className="relative rounded-[2.2rem] border-[6px] border-slate-900 dark:border-slate-700 bg-gradient-to-b from-blue-700 to-blue-900 shadow-2xl overflow-hidden aspect-[9/18]">
        <div className="mx-auto mt-2 w-16 h-4 rounded-full bg-slate-900 dark:bg-slate-700" />
        <div className="px-4 pt-6 grid grid-cols-3 gap-x-3 gap-y-4">
          {Array.from({ length: 9 }).map((_, i) => (
            i === 4 ? (
              <div key={i} className="flex flex-col items-center gap-1">
                <img src={APP_ICON} alt="" className="w-12 h-12 rounded-2xl bg-white p-1 shadow-lg ring-2 ring-white/70" />
                <span className="text-[9px] font-semibold text-white leading-none">PCC Records</span>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-center gap-1 opacity-40">
                <div className="w-12 h-12 rounded-2xl bg-white/25" />
                <span className="w-8 h-1.5 rounded-full bg-white/40" />
              </div>
            )
          ))}
        </div>
        <div className="absolute bottom-3 inset-x-4 rounded-2xl bg-white/95 dark:bg-slate-800/95 p-2.5 flex items-start gap-2 shadow-lg">
          <img src={APP_ICON} alt="" className="w-6 h-6 rounded-md flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-gray-900 dark:text-white leading-tight">Ready for pickup</p>
            <p className="text-[8px] text-gray-600 dark:text-gray-300 leading-tight">Your Transcript of Records is ready at the Registrar’s Office.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Landing-page section that invites visitors to add the site to their home screen. */
export function InstallAppSection() {
  const { mode, install } = useInstallApp();
  const [showSteps, setShowSteps] = useState(false);

  return (
    <section id="app" className="py-16 sm:py-20 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-12 items-center">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5" /> PCC Records App
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Get the app on your phone
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0">
            Install PCC Records on your home screen. No Play Store or App Store needed. It’s free, takes a few seconds,
            and uses almost no storage.
          </p>

          <ul className="mt-6 grid grid-cols-2 gap-2.5 max-w-md mx-auto lg:mx-0">
            {PERKS.map(perk => (
              <li key={perk.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm text-left">
                <perk.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{perk.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            {mode === 'installed' ? (
              <p className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-semibold text-sm">
                <CheckCircle className="w-4 h-4" /> Installed on this device
              </p>
            ) : mode === 'prompt' ? (
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-lg shadow-blue-700/25 transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" /> Install the app
              </button>
            ) : showSteps ? (
              <div className="max-w-2xl mx-auto lg:mx-0 text-left">
                <Steps mode={mode} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSteps(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-lg shadow-blue-700/25 transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" /> {mode === 'ios' ? 'Add to iPhone' : 'Install the app'}
              </button>
            )}
          </div>
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}

/** Small dismissible nudge for dashboards. Hidden once installed or dismissed. */
export function InstallAppBanner({ className = '' }: { className?: string }) {
  const { mode, install } = useInstallApp();
  const [showSteps, setShowSteps] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || mode === 'installed') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <img src={APP_ICON} alt="" className="w-11 h-11 rounded-xl bg-white p-1 shadow ring-1 ring-blue-100 dark:ring-slate-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Install the PCC Records app</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Open it from your home screen in one tap. No app store needed.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => (mode === 'prompt' ? void install() : setShowSteps(v => !v))}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white"
          >
            <Download className="w-4 h-4" />
            {mode === 'prompt' ? 'Install' : 'How to install'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="hidden sm:inline-flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showSteps && mode !== 'prompt' && (
        <div className="mt-3">
          <Steps mode={mode} compact />
        </div>
      )}
    </div>
  );
}
