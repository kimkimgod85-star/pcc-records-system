import { useEffect, useState } from 'react';
import { withBase } from './basePath';
import { shareLoginWithInstalledApp } from './supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHANGE_EVENT = 'pcc-install-changed';
let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    shareLoginWithInstalledApp();
    notify();
  });
  // The browser only offers "Install" once the service worker is registered.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    const register = () => {
      navigator.serviceWorker.register(withBase('sw.js'), { updateViaCache: 'none' }).catch(() => undefined);
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
}

export function isRunningAsApp() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual';

function currentMode(): InstallMode {
  if (justInstalled || isRunningAsApp()) return 'installed';
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  return 'manual';
}

/** Whether this browser can install the site as an app, and a one-tap install when it can. */
export function useInstallApp() {
  const [mode, setMode] = useState<InstallMode>(currentMode);

  useEffect(() => {
    const sync = () => setMode(currentMode());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const install = async () => {
    if (!deferred) return false;
    const event = deferred;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    if (outcome === 'accepted') justInstalled = true;
    notify();
    return outcome === 'accepted';
  };

  return { mode, install };
}
