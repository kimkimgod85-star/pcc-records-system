import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, isGoogleAuthEnabled, requireSupabase } from '../lib/supabase';
import { withBase } from '../lib/basePath';
import { TERMS_VERSION } from '../lib/terms';

export type UserRole = 'student' | 'alumni' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  role: UserRole;
  avatar?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  studentId?: string;
  role: 'student' | 'alumni';
}

export interface GoogleRegisterDraft {
  fullName: string;
  studentId?: string;
  role: 'student' | 'alumni';
}

export type LoginPortal = 'student' | 'staff';

export const GOOGLE_REGISTER_KEY = 'pcc-google-register';
export const UNREGISTERED_GOOGLE_MESSAGE =
  'No PCC account yet. Create an account on Register first, then you can sign in with Google.';

interface AuthContextType {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, portal?: LoginPortal) => Promise<{ success: boolean; error?: string; user?: User; needsVerification?: boolean; needsLoginCode?: boolean }>;
  verifyLoginCode: (email: string, code: string, trustThisDevice: boolean) => Promise<{ success: boolean; error?: string; user?: User }>;
  resendLoginCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string; needsEmailConfirm?: boolean }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  resendEmailCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (intent?: 'login' | 'register', draft?: GoogleRegisterDraft) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithCode: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  ready: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  verifyEmailCode: async () => ({ success: false }),
  resendEmailCode: async () => ({ success: false }),
  verifyLoginCode: async () => ({ success: false }),
  resendLoginCode: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  resetPasswordWithCode: async () => ({ success: false }),
  logout: async () => {},
  isAuthenticated: false,
});

function explainAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'Google is still off in Supabase. Open Authentication → Providers → Google, turn it ON, add Google Client ID and Secret, then Save.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email first. Enter the code we sent to your inbox.';
  }
  if (m.includes('expired') || (m.includes('invalid') && m.includes('token')) || m.includes('otp')) {
    return 'That code is wrong or has expired. Check the latest email, or send a new code.';
  }
  if (m.includes('rate limit') || m.includes('for security purposes')) {
    return 'Too many codes requested. Please wait a minute, then try again.';
  }
  if (m.includes('invalid login')) {
    return 'Wrong email or password. Create an account on Register first if you have not.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'This email is already registered. Sign in, or finish registration with Google on the Register page.';
  }
  if (m.includes('deactivated')) {
    return message;
  }
  return message;
}

export function explainPasswordError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('different from the old')) return 'Your new password must be different from your old password.';
  if (m.includes('at least') || m.includes('weak') || m.includes('short')) return 'Password is too weak. Use at least 6 characters.';
  return explainAuthError(message);
}

function mapRole(value: unknown): UserRole {
  if (value === 'admin' || value === 'alumni' || value === 'student') return value;
  return 'student';
}

export function readGoogleRegisterDraft(): GoogleRegisterDraft | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_REGISTER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GoogleRegisterDraft;
    if (!data?.fullName?.trim()) return null;
    if (data.role !== 'student' && data.role !== 'alumni') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearGoogleRegisterDraft() {
  try {
    sessionStorage.removeItem(GOOGLE_REGISTER_KEY);
  } catch {
    /* ignore */
  }
}

function isPendingGoogleRegister() {
  return Boolean(readGoogleRegisterDraft());
}

export function hasCompletedPccRegistration(_authUser: AuthUser, profile: { role?: string } | null) {
  return Boolean(profile);
}

async function mapAuthUser(authUser: AuthUser): Promise<User> {
  const client = requireSupabase();
  const meta = authUser.user_metadata || {};

  const { data, error } = await client
    .from('profiles')
    .select('full_name, student_id, role, email, status')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;

  if (data?.status === 'inactive') {
    await client.auth.signOut();
    throw new Error('This account has been deactivated. Contact the registrar.');
  }

  if (!data || !hasCompletedPccRegistration(authUser, data)) {
    if (isPendingGoogleRegister()) {
      throw new Error('PENDING_REGISTER');
    }
    throw new Error(UNREGISTERED_GOOGLE_MESSAGE);
  }

  return {
    id: authUser.id,
    email: data.email || authUser.email || '',
    name: data.full_name || meta.full_name || meta.name || (authUser.email || 'User').split('@')[0],
    studentId: data.student_id || undefined,
    role: mapRole(data.role),
    avatar: meta.avatar_url || meta.picture || undefined,
  };
}

async function createProfileFromAuthUser(authUser: AuthUser) {
  const meta = authUser.user_metadata || {};
  const role = meta.role === 'alumni' ? 'alumni' : 'student';
  const { error } = await requireSupabase().from('profiles').upsert({
    id: authUser.id,
    email: authUser.email,
    full_name: meta.full_name || meta.name || (authUser.email || 'User').split('@')[0],
    student_id: meta.student_id || '',
    role,
    status: 'active',
  });
  if (error) throw error;
}

const TRUSTED_DEVICE_DAYS = 30;
const trustedDeviceKey = (userId: string) => `pcc-trusted-device:${userId}`;

// Built-in staff accounts use placeholder emails that cannot receive a code.
const NO_INBOX_DOMAINS = ['@pcc.edu'];

function isTrustedDevice(userId: string) {
  try {
    const until = Number(localStorage.getItem(trustedDeviceKey(userId)) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function trustDevice(userId: string) {
  try {
    localStorage.setItem(trustedDeviceKey(userId), String(Date.now() + TRUSTED_DEVICE_DAYS * 86_400_000));
  } catch {
    /* storage unavailable */
  }
}

function needsLoginCode(user: User) {
  const email = user.email.toLowerCase();
  if (NO_INBOX_DOMAINS.some(domain => email.endsWith(domain))) return false;
  return !isTrustedDevice(user.id);
}

// Used after a password, email code, or reset code proves the person owns this account.
// Finishes a missing profile, e.g. for someone who only ever signed in with Google.
async function mapOrCreateProfile(authUser: AuthUser) {
  try {
    return await mapAuthUser(authUser);
  } catch (err) {
    if (!(err instanceof Error) || err.message !== UNREGISTERED_GOOGLE_MESSAGE) throw err;
    await createProfileFromAuthUser(authUser);
    return mapAuthUser(authUser);
  }
}

export async function completePendingGoogleRegistration(authUser: AuthUser) {
  const draft = readGoogleRegisterDraft();
  if (!draft) return false;
  const client = requireSupabase();
  const { error } = await client.from('profiles').upsert({
    id: authUser.id,
    email: authUser.email,
    full_name: draft.fullName.trim(),
    student_id: draft.studentId?.trim() || '',
    role: draft.role,
    status: 'active',
  });
  if (error) throw error;
  await client.auth.updateUser({
    data: {
      registered: true,
      full_name: draft.fullName.trim(),
      student_id: draft.studentId?.trim() || '',
      role: draft.role,
      terms_version: TERMS_VERSION,
      terms_accepted_at: new Date().toISOString(),
    },
  });
  clearGoogleRegisterDraft();
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  // While login() checks the account type, ignore the auth listener so the user is not set early.
  const loginInProgress = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    const client = requireSupabase();
    let alive = true;

  const applySession = async (session: Session | null) => {
      if (session?.user && loginInProgress.current) return;
      if (!session?.user) {
        if (alive) setUser(null);
        return;
      }
      try {
        const mapped = await mapAuthUser(session.user);
        if (alive) setUser(mapped);
      } catch (err) {
        if (alive) setUser(null);
        const message = err instanceof Error ? err.message : '';
        if (message.toLowerCase().includes('deactivated')) {
          console.warn(message);
        }
        if (
          message === UNREGISTERED_GOOGLE_MESSAGE &&
          !window.location.pathname.includes('/auth/callback')
        ) {
          await client.auth.signOut();
        }
      }
    };

    client.auth.getSession().then(({ data }) => {
      applySession(data.session).finally(() => {
        if (alive) setReady(true);
      });
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const missingConfig = (): { success: false; error: string } => ({
    success: false,
    error: 'Supabase is not set up yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart npm run dev.',
  });

  const login = async (email: string, password: string, portal?: LoginPortal) => {
    if (!isSupabaseConfigured) return missingConfig();
    const client = requireSupabase();
    loginInProgress.current = true;
    try {
      return await signInWithPortal(client, email, password, portal);
    } finally {
      loginInProgress.current = false;
    }
  };

  const signInWithPortal = async (
    client: ReturnType<typeof requireSupabase>,
    email: string,
    password: string,
    portal?: LoginPortal,
  ) => {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error?.message.toLowerCase().includes('email not confirmed')) {
      return { success: false, needsVerification: true, error: explainAuthError(error.message) };
    }
    if (error || !data.user) {
      return { success: false, error: explainAuthError(error?.message || 'Login failed.') };
    }
    try {
      const mapped = await mapOrCreateProfile(data.user);
      const isStaff = mapped.role === 'admin';
      if (portal && (portal === 'staff') !== isStaff) {
        await client.auth.signOut({ scope: 'local' });
        setUser(null);
        return {
          success: false,
          error: isStaff
            ? 'This is an Admin / Registrar account. Please use the Admin / Registrar login.'
            : 'This is a Student / Alumni account. Please use the Student / Alumni login.',
        };
      }

      if (needsLoginCode(mapped)) {
        await client.auth.signOut({ scope: 'local' });
        setUser(null);
        const { error: otpError } = await client.auth.signInWithOtp({
          email: mapped.email || email.trim(),
          options: { shouldCreateUser: false },
        });
        if (otpError) return { success: false, error: explainAuthError(otpError.message) };
        return { success: false, needsLoginCode: true };
      }

      setUser(mapped);
      return { success: true, user: mapped };
    } catch (err) {
      await client.auth.signOut({ scope: 'local' });
      setUser(null);
      return { success: false, error: explainAuthError(err instanceof Error ? err.message : 'Login failed.') };
    }
  };

  const register = async (input: RegisterInput) => {
    if (!isSupabaseConfigured) return missingConfig();
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}${withBase('auth/callback')}`,
        data: {
          registered: true,
          full_name: input.fullName.trim(),
          student_id: input.studentId?.trim() || '',
          role: input.role,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    if (error) return { success: false, error: explainAuthError(error.message) };
    if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
      return { success: false, error: 'This email is already registered. Please sign in.' };
    }
    if (!data.session) {
      return { success: true, needsEmailConfirm: true };
    }
    if (data.user) setUser(await mapAuthUser(data.user));
    return { success: true };
  };

  const verifyEmailCode = async (email: string, code: string) => {
    if (!isSupabaseConfigured) return missingConfig();
    const client = requireSupabase();
    const { data, error } = await client.auth.verifyOtp({
      email: email.trim(),
      token: code.replace(/\s/g, ''),
      type: 'signup',
    });
    if (error || !data.user) {
      return { success: false, error: explainAuthError(error?.message || 'Could not verify the code.') };
    }
    try {
      const mapped = await mapOrCreateProfile(data.user);
      setUser(mapped);
      return { success: true, user: mapped };
    } catch (err) {
      await client.auth.signOut({ scope: 'local' });
      setUser(null);
      return { success: false, error: explainAuthError(err instanceof Error ? err.message : 'Could not verify the code.') };
    }
  };

  const verifyLoginCode = async (email: string, code: string, trustThisDevice: boolean) => {
    if (!isSupabaseConfigured) return missingConfig();
    const client = requireSupabase();
    loginInProgress.current = true;
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.replace(/\s/g, ''),
        type: 'email',
      });
      if (error || !data.user) {
        return { success: false, error: explainAuthError(error?.message || 'Could not verify the code.') };
      }
      try {
        const mapped = await mapOrCreateProfile(data.user);
        if (trustThisDevice) trustDevice(mapped.id);
        setUser(mapped);
        return { success: true, user: mapped };
      } catch (err) {
        await client.auth.signOut({ scope: 'local' });
        setUser(null);
        return { success: false, error: explainAuthError(err instanceof Error ? err.message : 'Could not verify the code.') };
      }
    } finally {
      loginInProgress.current = false;
    }
  };

  const resendLoginCode = async (email: string) => {
    if (!isSupabaseConfigured) return missingConfig();
    const { error } = await requireSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    if (error) return { success: false, error: explainAuthError(error.message) };
    return { success: true };
  };

  const resendEmailCode = async (email: string) => {
    if (!isSupabaseConfigured) return missingConfig();
    if (!email.trim()) return { success: false, error: 'Enter your email first.' };
    const { error } = await requireSupabase().auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${withBase('auth/callback')}` },
    });
    if (error) return { success: false, error: explainAuthError(error.message) };
    return { success: true };
  };

  const loginWithGoogle = async (intent: 'login' | 'register' = 'login', draft?: GoogleRegisterDraft) => {
    if (!isSupabaseConfigured) return missingConfig();
    const googleOn = await isGoogleAuthEnabled();
    if (!googleOn) {
      return {
        success: false,
        error: 'Google is still off in Supabase. Open Authentication → Providers → Google, turn it ON, paste Client ID and Secret, Save, then try again.',
      };
    }

    if (intent === 'register') {
      const fullName = draft?.fullName.trim() || '';
      if (!fullName) {
        return { success: false, error: 'Enter your full name first, then continue with Google.' };
      }
      if (draft?.role !== 'student' && draft?.role !== 'alumni') {
        return { success: false, error: 'Choose Student or Alumni first, then continue with Google.' };
      }
      try {
        sessionStorage.setItem(
          GOOGLE_REGISTER_KEY,
          JSON.stringify({
            fullName,
            studentId: draft.studentId?.trim() || '',
            role: draft.role,
          } satisfies GoogleRegisterDraft),
        );
      } catch {
        return { success: false, error: 'Could not save registration details. Allow site data, then try again.' };
      }
    } else {
      clearGoogleRegisterDraft();
    }

    const client = requireSupabase();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${withBase('auth/callback')}?intent=${intent}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      if (intent === 'register') clearGoogleRegisterDraft();
      return { success: false, error: explainAuthError(error.message) };
    }
    return { success: true };
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) return missingConfig();
    if (!email.trim()) return { success: false, error: 'Enter your email first, then click Forgot password.' };
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${withBase('auth/callback')}?type=recovery`,
    });
    if (error) return { success: false, error: explainAuthError(error.message) };
    return { success: true };
  };

  const resetPasswordWithCode = async (email: string, code: string, newPassword: string) => {
    if (!isSupabaseConfigured) return missingConfig();
    const client = requireSupabase();
    loginInProgress.current = true;
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.replace(/\s/g, ''),
        type: 'recovery',
      });
      if (error || !data.user) {
        return { success: false, error: explainAuthError(error?.message || 'Could not verify the code.') };
      }
      const { error: updateError } = await client.auth.updateUser({ password: newPassword });
      if (updateError) {
        await client.auth.signOut({ scope: 'local' });
        return { success: false, error: explainPasswordError(updateError.message) };
      }
      try {
        const mapped = await mapOrCreateProfile(data.user);
        setUser(mapped);
        return { success: true, user: mapped };
      } catch (err) {
        await client.auth.signOut({ scope: 'local' });
        setUser(null);
        return { success: false, error: explainAuthError(err instanceof Error ? err.message : 'Could not sign in.') };
      }
    } finally {
      loginInProgress.current = false;
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await requireSupabase().auth.signOut({ scope: 'local' });
    }
    setUser(null);
    try {
      localStorage.removeItem('pcc-user');
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, verifyEmailCode, resendEmailCode, verifyLoginCode, resendLoginCode, loginWithGoogle, resetPassword, resetPasswordWithCode, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
