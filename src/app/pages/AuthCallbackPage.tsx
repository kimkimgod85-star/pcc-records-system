import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { requireSupabase } from '../lib/supabase';
import {
  completePendingGoogleRegistration,
  explainPasswordError,
  hasCompletedPccRegistration,
  isDeactivatedMessage,
  readGoogleRegisterDraft,
  UNREGISTERED_GOOGLE_MESSAGE,
} from '../context/AuthContext';
import { studentHome } from './WelcomePage';
import { adminHome } from './admin/AdminWelcomePage';

function explainCallbackError(message: string, recovery = false) {
  const m = message.toLowerCase();
  if (recovery && (m.includes('pkce') || m.includes('code verifier') || m.includes('expired') || m.includes('invalid'))) {
    return 'This reset link only works in the same browser where you clicked Forgot password, or it has expired. Go back to Sign in, click Forgot password, and use the code from the email instead.';
  }
  if (m.includes('pkce') || m.includes('code verifier')) {
    return 'Google sign-in was interrupted. Stay in the same browser tab, use http://localhost:5173 (not 127.0.0.1), then click Continue with Google again.';
  }
  return message;
}

function NewPasswordForm({ onDone }: { onDone: (path: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    const client = requireSupabase();
    const { data, error: updateError } = await client.auth.updateUser({ password });
    if (updateError || !data.user) {
      setSaving(false);
      setError(explainPasswordError(updateError?.message || 'Could not save the new password.'));
      return;
    }
    const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    onDone(profile?.role === 'admin' ? adminHome(data.user.id) : studentHome(data.user.id));
  };

  const fieldClass =
    'w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 text-sm';

  return (
    <div className="min-h-svh flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl p-5 sm:p-7 space-y-4">
        <div>
          <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.45rem', fontWeight: 600 }}>
            Set a new password
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose a new password for your PCC Records account.</p>
        </div>
        {error && (
          <p className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">{error}</p>
        )}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type it again" className={fieldClass} />
        </div>
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-60 text-white font-semibold">
          {saving ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const search = new URLSearchParams(window.location.search);
  const isRecovery = search.get('type') === 'recovery';
  const isEmailLinkError = isRecovery || (search.get('error_code') || '').startsWith('otp');

  useEffect(() => {
    const finish = async () => {
      try {
        const client = requireSupabase();
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error_description') || params.get('error');
        if (oauthError) {
          setError(
            (params.get('error_code') || '').startsWith('otp')
              ? 'This email link has expired or was already used. Only the newest email works, and each link works once. Request a new one and use the code from the latest email.'
              : explainCallbackError(oauthError, isRecovery),
          );
          return;
        }

        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            const { data: existing } = await client.auth.getSession();
            if (!existing.session) {
              setError(explainCallbackError(exchangeError.message, isRecovery));
              return;
            }
          }
        }

        const { data } = await client.auth.getSession();
        if (!data.session) {
          setError(isRecovery
            ? explainCallbackError('expired', true)
            : 'Google sign-in did not complete. Try Continue with Google again.');
          return;
        }

        if (isRecovery) {
          setRecoveryReady(true);
          return;
        }

        const draft = readGoogleRegisterDraft();
        if (draft) {
          await completePendingGoogleRegistration(data.session.user);
        }

        const { data: profile } = await client
          .from('profiles')
          .select('role, email, status')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profile?.status === 'inactive') {
          await client.auth.signOut({ scope: 'local' });
          navigate('/login?reason=deactivated', { replace: true });
          return;
        }

        if (!hasCompletedPccRegistration(data.session.user, profile)) {
          await client.auth.signOut();
          navigate('/login?reason=unregistered', { replace: true });
          return;
        }

        navigate(profile?.role === 'admin' ? adminHome(data.session.user.id) : studentHome(data.session.user.id), { replace: true });
      } catch (err) {
        if (err instanceof Error && isDeactivatedMessage(err.message)) {
          navigate('/login?reason=deactivated', { replace: true });
          return;
        }
        setError(err instanceof Error ? explainCallbackError(err.message) : 'Sign-in failed.');
      }
    };

    finish();
  }, [navigate, isRecovery]);

  if (recoveryReady) {
    return <NewPasswordForm onDone={path => navigate(path, { replace: true })} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error || UNREGISTERED_GOOGLE_MESSAGE}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isEmailLinkError ? (
                <button
                  type="button"
                  onClick={() => navigate('/login?forgot=1', { replace: true })}
                  className="px-4 py-2 rounded-lg bg-blue-800 text-white text-sm font-semibold"
                >
                  Reset password again
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/register', { replace: true })}
                  className="px-4 py-2 rounded-lg bg-blue-800 text-white text-sm font-semibold"
                >
                  Go to Register
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                Back to login
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">{isRecovery ? 'Opening password reset…' : 'Signing you in with Google…'}</p>
        )}
      </div>
    </div>
  );
}
