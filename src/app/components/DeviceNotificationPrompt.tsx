import { useState, type ReactNode } from 'react';
import { BellRing, BellOff, Loader2, X, Smartphone, Send } from 'lucide-react';
import {
  disableDeviceNotifications,
  enableDeviceNotifications,
  isIOSBrowserTab,
  syncPushSubscription,
  useDeviceNotificationState,
} from '../lib/deviceNotifications';
import { addNotification } from '../lib/notifications';

const DISMISS_KEY = 'pcc-device-notif-dismissed';

/** Full on/off control with every permission state explained. */
export function DeviceNotificationCard({ userId }: { userId: string }) {
  const { permission, enabled, active } = useDeviceNotificationState(userId);
  const [busy, setBusy] = useState(false);

  const turnOn = async () => {
    setBusy(true);
    try {
      await enableDeviceNotifications(userId);
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      await syncPushSubscription(userId);
      await addNotification({
        userId,
        type: 'info',
        title: 'Notifications are on',
        message: 'You’ll get updates from the PCC Registrar on this device.',
        link: '/notifications',
      });
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;
  if (permission === 'unsupported') {
    body = (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {isIOSBrowserTab()
          ? 'On iPhone or iPad, tap Share → “Add to Home Screen”, open PCC Records from your home screen, then turn this on.'
          : 'This browser can’t show device notifications. Try Chrome, Edge, or Firefox.'}
      </p>
    );
  } else if (permission === 'denied') {
    body = (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Notifications are blocked for this site. Click the lock icon beside the web address, set
        <span className="font-medium text-gray-800 dark:text-gray-200"> Notifications </span>
        to <span className="font-medium text-gray-800 dark:text-gray-200">Allow</span>, then reload the page.
      </p>
    );
  } else if (active) {
    body = (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send a test
        </button>
        <button
          type="button"
          onClick={() => disableDeviceNotifications(userId)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
        >
          <BellOff className="w-3.5 h-3.5" /> Turn off
        </button>
      </div>
    );
  } else {
    body = (
      <button
        type="button"
        onClick={turnOn}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
        {enabled || permission === 'granted' ? 'Turn on' : 'Allow notifications'}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 sm:p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
        active ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      }`}>
        <Smartphone className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900 dark:text-white">Device notifications</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            active
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
          }`}>
            {active ? 'On' : 'Off'}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
          Get a pop-up on this phone or computer the moment your request or payment is updated, even when the site is closed.
        </p>
        {body}
      </div>
    </div>
  );
}

/** Small dismissible nudge, shown only while the browser hasn't been asked yet. */
export function DeviceNotificationBanner({ userId }: { userId: string }) {
  const { permission, active } = useDeviceNotificationState(userId);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(`${DISMISS_KEY}:${userId}`) === '1';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  if (dismissed || active || permission !== 'default') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`${DISMISS_KEY}:${userId}`, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const allow = async () => {
    setBusy(true);
    try {
      await enableDeviceNotifications(userId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <BellRing className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Get notified on this device</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Know right away when your document is approved, verified, or ready for pickup.</p>
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
          onClick={allow}
          disabled={busy}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
          Allow
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="hidden sm:inline-flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
