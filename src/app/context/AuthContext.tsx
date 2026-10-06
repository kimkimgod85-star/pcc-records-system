import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, isGoogleAuthEnabled, requireSupabase } from '../lib/supabase';
import { withBase } from '../lib/basePath';

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

export const GOOGLE_REGISTER_KEY = 'pcc-google-register';
export const UNREGISTERED_GOOGLE_MESSAGE =
  'No PCC account yet. Create an account on Register first, then you can sign in with Google.';

interface AuthContextType {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string; needsEmailConfirm?: boolean }>;
  loginWithGoogle: (intent?: 'login' | 'register', draft?: GoogleRegisterDraft) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  ready: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  logout: async () => {},
  isAuthenticated: false,
});

function explainAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'Google is still off in Supabase. Open Authentication → Providers → Google, turn it ON, add Google Client ID and Secret, then Save.';
  }
  if (m.includes('email not confirmed')) {
    return 'Your account exists, but email confirmation is still ON in Supabase. Open Authentication → Providers → Email, turn Confirm email OFF, Save, then Sign in again.';
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
    },
  });
  clearGoogleRegisterDraft();
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    const client = requireSupabase();
    let alive = true;

  const applySession = async (session: Session | null) => {
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

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return missingConfig();
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      return { success: false, error: explainAuthError(error?.message || 'Login failed.') };
    }
    try {
      const mapped = await mapAuthUser(data.user);
      setUser(mapped);
      return { success: true, user: mapped };
    } catch (err) {
      await client.auth.signOut();
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
        data: {
          registered: true,
          full_name: input.fullName.trim(),
          student_id: input.studentId?.trim() || '',
          role: input.role,
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
      redirectTo: `${window.location.origin}${withBase('auth/callback')}`,
    });
    if (error) return { success: false, error: explainAuthError(error.message) };
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await requireSupabase().auth.signOut();
    }
    setUser(null);
    try {
      localStorage.removeItem('pcc-user');
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, loginWithGoogle, resetPassword, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
