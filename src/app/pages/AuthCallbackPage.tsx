import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { requireSupabase } from '../lib/supabase';
import {
  completePendingGoogleRegistration,
  hasCompletedPccRegistration,
  readGoogleRegisterDraft,
  UNREGISTERED_GOOGLE_MESSAGE,
} from '../context/AuthContext';
import { studentHome } from './WelcomePage';
import { adminHome } from './admin/AdminWelcomePage';

function explainCallbackError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('pkce') || m.includes('code verifier')) {
    return 'Google sign-in was interrupted. Stay in the same browser tab, use http://localhost:5173 (not 127.0.0.1), then click Continue with Google again.';
  }
  return message;
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const finish = async () => {
      try {
        const client = requireSupabase();
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error_description') || params.get('error');
        if (oauthError) {
          setError(oauthError);
          return;
        }

        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            const { data: existing } = await client.auth.getSession();
            if (!existing.session) {
              setError(explainCallbackError(exchangeError.message));
              return;
            }
          }
        }

        const { data } = await client.auth.getSession();
        if (!data.session) {
          setError('Google sign-in did not complete. Try Continue with Google again.');
          return;
        }

        const draft = readGoogleRegisterDraft();
        if (draft) {
          await completePendingGoogleRegistration(data.session.user);
        }

        const { data: profile } = await client
          .from('profiles')
          .select('role, email')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (!hasCompletedPccRegistration(data.session.user, profile)) {
          await client.auth.signOut();
          navigate('/login?reason=unregistered', { replace: true });
          return;
        }

        navigate(profile?.role === 'admin' ? adminHome(data.session.user.id) : studentHome(data.session.user.id), { replace: true });
      } catch (err) {
        setError(err instanceof Error ? explainCallbackError(err.message) : 'Sign-in failed.');
      }
    };

    finish();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error || UNREGISTERED_GOOGLE_MESSAGE}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/register', { replace: true })}
                className="px-4 py-2 rounded-lg bg-blue-800 text-white text-sm font-semibold"
              >
                Go to Register
              </button>
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
          <p className="text-sm text-gray-600 dark:text-gray-300">Signing you in with Google…</p>
        )}
      </div>
    </div>
  );
}
