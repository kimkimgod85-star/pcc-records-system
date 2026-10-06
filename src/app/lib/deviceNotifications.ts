import { useEffect, useState } from 'react';
import { isSupabaseConfigured, requireSupabase } from './supabase';
import { withBase } from './basePath';

const PREF_KEY = 'pcc-device-notif';
const PREF_EVENT = 'pcc-device-notif-changed';
const ICON = withBase('PCC%20LOGO.png');
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BCapBNK7HDQT3wwsktF7Q3gnx626mz9GgafdqIc4uBqBgXFEw9BfZOhneeqx1cEWJWLvYYUw51uvw0_a7QzPM50';

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
      ? navigator.serviceWorker
          .register(withBase('sw.js'), { updateViaCache: 'none' })
          .then(() => navigator.serviceWorker.ready)
          .catch(() => null)
      : Promise.resolve(null);
  }
  return registration;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Subscribes this browser to Web Push and saves it, so notifications arrive even when the site is closed. */
export async function syncPushSubscription(userId: string) {
  if (!pushSupported() || !isSupabaseConfigured || getDevicePermission() !== 'granted') return false;
  const reg = await getRegistration();
  if (!reg) return false;
  try {
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let sub = await reg.pushManager.getSubscription();
    const current = sub?.options.applicationServerKey;
    if (sub && current && new Uint8Array(current).toString() !== key.toString()) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const { error } = await requireSupabase()
      .from('push_subscriptions')
      .upsert(
        { endpoint: json.endpoint, user_id: userId, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'endpoint,user_id' },
      );
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Could not turn on push notifications', error);
    return false;
  }
}

async function removePushSubscription(userId: string) {
  if (!pushSupported() || !isSupabaseConfigured) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(withBase(''));
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await requireSupabase().from('push_subscriptions').delete().eq('endpoint', sub.endpoint).eq('user_id', userId);
  } catch (error) {
    console.warn(error);
  }
}

export async function enableDeviceNotifications(userId: string): Promise<DevicePermission> {
  if (!deviceNotificationsSupported()) return 'unsupported';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  writePref(userId, permission === 'granted');
  if (permission === 'granted') await syncPushSubscription(userId);
  return permission;
}

export function disableDeviceNotifications(userId: string) {
  writePref(userId, false);
  void removePushSubscription(userId);
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
    void syncPushSubscription(userId);
    const client = requireSupabase();
    const channel = client
      .channel(`pcc-device-notif-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          const row = payload.new as { id?: string; title?: string; message?: string; link?: string };
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
