import { createClient } from '@supabase/supabase-js';

function cleanSupabaseUrl(raw?: string) {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1.*$/i, '')
    .replace(/\/auth\/v1.*$/i, '');
}

const url = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseUrl = url;
export const isSupabaseConfigured = Boolean(url && anonKey);

// Each browser tab keeps its own login so different accounts can be open side by side.
// The storage key is per tab because Supabase syncs logins between tabs that share a key.
// The installed app is a single window, so it keeps its login on the device instead;
// otherwise closing the app would sign the user out.
const TAB_ID_KEY = 'pcc-auth-tab';
const APP_STORAGE_KEY = 'pcc-auth-app';
const CODE_VERIFIER_KEY = 'pcc-auth-code-verifier';

function runningAsInstalledApp() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

const installedApp = typeof window !== 'undefined' && runningAsInstalledApp();
const sessionStore = (): Storage => (installedApp ? localStorage : sessionStorage);

function tabStorageKey() {
  if (installedApp) return APP_STORAGE_KEY;
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return `pcc-auth-${id}`;
  } catch {
    return 'pcc-auth';
  }
}

/** Copies this tab's login to the installed app, so it opens already signed in. */
export function shareLoginWithInstalledApp() {
  if (installedApp) return;
  try {
    const session = sessionStorage.getItem(tabStorageKey());
    if (session) localStorage.setItem(APP_STORAGE_KEY, session);
  } catch {
    /* storage unavailable */
  }
}

// Email links (password reset) open in a new tab, so the PKCE verifier must be shared.
const isVerifier = (key: string) => key.endsWith('-code-verifier');

const tabStorage = {
  getItem: (key: string) => {
    try {
      return isVerifier(key) ? localStorage.getItem(CODE_VERIFIER_KEY) : sessionStore().getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (isVerifier(key)) localStorage.setItem(CODE_VERIFIER_KEY, value);
      else sessionStore().setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (key: string) => {
    try {
      if (isVerifier(key)) localStorage.removeItem(CODE_VERIFIER_KEY);
      else sessionStore().removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: tabStorage,
        storageKey: tabStorageKey(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
  }
  return supabase;
}

export async function isGoogleAuthEnabled() {
  if (!url || !anonKey) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const data = await res.json();
    return Boolean(data?.external?.google);
  } catch {
    return false;
  }
}
