import { useEffect, useState } from 'react';
import { isSupabaseConfigured, requireSupabase } from './supabase';
import { withBase } from './basePath';

const PREF_KEY = 'pcc-device-notif';
const PREF_EVENT = 'pcc-device-notif-changed';
const ICON = withBase('PCC%20LOGO.png');

export type DevicePermission = NotificationPermission | 'unsupported';

export function deviceNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext;
}

export function isIOSBrowserTab() {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return ios && !standalone;
}

export function getDevicePermission(): DevicePermission {
  return deviceNotificationsSupported() ? Notification.permission : 'unsupported';
}

function readPref(userId: string) {
  try {
    return localStorage.getItem(`${PREF_KEY}:${userId}`) === '1';
  } catch {
    return false;
  }
}

function writePref(userId: string, on: boolean) {
  try {
    if (on) localStorage.setItem(`${PREF_KEY}:${userId}`, '1');
    else localStorage.removeItem(`${PREF_KEY}:${userId}`);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREF_EVENT));
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

function getRegistration() {
  if (!registration) {
    registration = 'serviceWorker' in navigator
      ? navigator.serviceWorker.register(withBase('sw.js')).then(() => navigator.serviceWorker.ready).catch(() => null)
      : Promise.resolve(null);
  }
  return registration;
}

export async function enableDeviceNotifications(userId: string): Promise<DevicePermission> {
  if (!deviceNotificationsSupported()) return 'unsupported';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  writePref(userId, permission === 'granted');
  if (permission === 'granted') await getRegistration();
  return permission;
}

export function disableDeviceNotifications(userId: string) {
  writePref(userId, false);
}

export async function showDeviceNotification(input: { id: string; title: string; body: string; url?: string }) {
  if (getDevicePermission() !== 'granted') return;
  const options: NotificationOptions = {
    body: input.body,
    icon: ICON,
    badge: ICON,
    tag: input.id,
    data: { url: withBase(input.url || '/notifications') },
  };
  const reg = await getRegistration();
  if (reg) {
    await reg.showNotification(input.title, options);
    return;
  }
  const notice = new Notification(input.title, options);
  notice.onclick = () => {
    window.focus();
    window.location.assign(withBase(input.url || '/notifications'));
    notice.close();
  };
}

/** Current permission + this user's on/off choice, kept in sync across components. */
export function useDeviceNotificationState(userId?: string) {
  const [permission, setPermission] = useState<DevicePermission>(getDevicePermission);
  const [enabled, setEnabled] = useState(() => (userId ? readPref(userId) : false));

  useEffect(() => {
    const sync = () => {
      setPermission(getDevicePermission());
      setEnabled(userId ? readPref(userId) : false);
    };
    sync();
    window.addEventListener(PREF_EVENT, sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener(PREF_EVENT, sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [userId]);

  return { permission, enabled, active: permission === 'granted' && enabled };
}

/** Pops a device notification whenever a new notification row is inserted for this user. */
export function useDeviceNotificationListener(userId?: string) {
  const { active } = useDeviceNotificationState(userId);

  useEffect(() => {
    if (!userId || !active || !isSupabaseConfigured) return;
    void getRegistration();
    const client = requireSupabase();
    const channel = client
      .channel(`pcc-device-notif-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          const row = payload.new as { id?: string; title?: string; message?: string; link?: string };
          if (document.visibilityState === 'visible' && document.hasFocus()) return;
          void showDeviceNotification({
            id: String(row.id || Date.now()),
            title: row.title || 'PCC Records',
            body: row.message || '',
            url: row.link || '/notifications',
          });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, active]);
}
