import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BellRing, CreditCard, FileText, Smartphone, Volume2, VolumeX, X } from 'lucide-react';
import type { AdminAlert } from '../lib/adminAlerts';
import { isAlertSoundOn, onAlertSoundChange, playOfficeChime, setAlertSound } from '../lib/officeChime';
import {
  disableDeviceNotifications,
  enableDeviceNotifications,
  useDeviceNotificationState,
} from '../lib/deviceNotifications';

export function AdminAlertToasts({ alerts, onDismiss }: { alerts: AdminAlert[]; onDismiss: (id: string) => void }) {
  const navigate = useNavigate();
  if (!alerts.length) return null;

  return (
    <div className="fixed z-[60] top-16 lg:top-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 space-y-2" aria-live="polite">
      {alerts.map(alert => {
        const Icon = alert.kind === 'payment' ? CreditCard : FileText;
        return (
          <div
            key={alert.id}
            role="link"
            tabIndex={0}
            onClick={() => { onDismiss(alert.id); navigate(alert.link); }}
            onKeyDown={e => { if (e.key === 'Enter') { onDismiss(alert.id); navigate(alert.link); } }}
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 shadow-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              alert.kind === 'payment'
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{alert.title}</p>
              <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-0.5 leading-snug break-words">{alert.detail}</p>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1.5">
                {alert.kind === 'payment' ? 'Open Payments' : 'Open Manage Requests'}
              </p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDismiss(alert.id); }}
              aria-label="Dismiss alert"
              className="-mr-1 -mt-1 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Sound and phone alert switches shown in the admin sidebar. */
export function AdminAlertSettings({ userId, collapsed }: { userId: string; collapsed: boolean }) {
  const [soundOn, setSoundOn] = useState(isAlertSoundOn);
  const { permission, active } = useDeviceNotificationState(userId);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAlertSoundChange(() => setSoundOn(isAlertSoundOn())), []);

  const toggleSound = () => {
    const next = !soundOn;
    setAlertSound(next);
    if (next) playOfficeChime(true);
  };

  const togglePhone = async () => {
    if (active) {
      disableDeviceNotifications(userId);
      return;
    }
    setBusy(true);
    try {
      await enableDeviceNotifications(userId);
    } finally {
      setBusy(false);
    }
  };

  const phoneLabel = permission === 'unsupported' ? 'Not supported' : permission === 'denied' ? 'Blocked' : active ? 'On' : 'Off';

  return (
    <>
      <SettingTile
        collapsed={collapsed}
        on={soundOn}
        label="Sound"
        title={soundOn ? 'Alert sound is on (click to turn off)' : 'Alert sound is off (click to turn on and play a test)'}
        icon={soundOn ? Volume2 : VolumeX}
        onClick={toggleSound}
      />
      <SettingTile
        collapsed={collapsed}
        on={active}
        label="Alerts"
        title={`Device alerts: ${phoneLabel}`}
        icon={Smartphone}
        onClick={togglePhone}
        disabled={busy || permission === 'denied' || permission === 'unsupported'}
      />
    </>
  );
}

export function SettingTile({
  collapsed,
  on,
  label,
  title,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  collapsed: boolean;
  on: boolean;
  label: string;
  title: string;
  icon: typeof BellRing;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      className={`relative flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
        collapsed ? 'w-full py-2.5' : 'flex-col gap-1 py-2'
      } ${
        on
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {!collapsed && <span className="text-xs font-medium leading-none">{label}</span>}
      <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
    </button>
  );
}
