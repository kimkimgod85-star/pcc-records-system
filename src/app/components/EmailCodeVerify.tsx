import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, MailCheck, RotateCw } from 'lucide-react';
import { useAuth, type User } from '../context/AuthContext';

const RESEND_SECONDS = 60;

interface Props {
  email: string;
  /** 'signup' confirms a new account; 'login' is the sign-in code sent after the password. */
  purpose?: 'signup' | 'login';
  /** Send a fresh code as soon as this screen opens (used when signing in to an unverified account). */
  sendOnOpen?: boolean;
  onVerified?: (user?: User) => void;
  onBack?: () => void;
  backLabel?: string;
}

export function EmailCodeVerify({ email, purpose = 'signup', sendOnOpen, onVerified, onBack, backLabel = 'Back to Sign in' }: Props) {
  const { verifyEmailCode, resendEmailCode, verifyLoginCode, resendLoginCode } = useAuth();
  const isLogin = purpose === 'login';
  const [trustThisDevice, setTrustThisDevice] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(sendOnOpen ? 0 : RESEND_SECONDS);
  const [verified, setVerified] = useState(false);
  const sentOnOpen = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(s => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    setError('');
    setInfo('');
    setSending(true);
    const result = isLogin ? await resendLoginCode(email) : await resendEmailCode(email);
    setSending(false);
    if (result.success) {
      setInfo(`A new code was sent to ${email}.`);
      setCooldown(RESEND_SECONDS);
      inputRef.current?.focus();
    } else {
      setError(result.error || 'Could not send the code.');
      setCooldown(RESEND_SECONDS);
    }
  };

  useEffect(() => {
    if (sendOnOpen && !sentOnOpen.current) {
      sentOnOpen.current = true;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendOnOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length < 6) {
      setError('Enter the full code from the email.');
      return;
    }
    setError('');
    setInfo('');
    setVerifying(true);
    const result = isLogin
      ? await verifyLoginCode(email, clean, trustThisDevice)
      : await verifyEmailCode(email, clean);
    setVerifying(false);
    if (!result.success) {
      setError(result.error || 'Could not verify the code.');
      return;
    }
    setVerified(true);
    onVerified?.(result.user);
  };

  if (verified) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-white">{isLogin ? 'Code accepted' : 'Email verified'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Opening your account…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <MailCheck className="w-6 h-6 text-blue-700 dark:text-blue-300" />
      </div>
      <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.45rem', fontWeight: 600 }}>
        {isLogin ? 'Check your email' : 'Verify your email'}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-5 leading-relaxed">
        {isLogin ? 'For your security, we sent a sign-in code to ' : 'We sent a verification code to '}
        <span className="font-semibold text-gray-900 dark:text-white break-all">{email}</span>.
        {isLogin ? ' Enter it below to finish signing in.' : ' Enter it below to prove this email is yours.'}
        {' '}Check your Spam or Promotions folder if you don’t see it.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {info && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">{info}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email-code" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
            Verification code
          </label>
          <input
            id="email-code"
            ref={inputRef}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="w-full px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
          />
        </div>

        {isLogin && (
          <label className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={trustThisDevice}
              onChange={e => setTrustThisDevice(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-700 focus:ring-blue-700"
            />
            <span>
              Don’t ask for a code on this device for 30 days
              <span className="block text-xs text-gray-500 dark:text-gray-400">Only tick this on your own phone or computer.</span>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={verifying}
          className="w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 text-white rounded-lg font-semibold bg-blue-800 hover:bg-blue-900 transition-colors"
        >
          {verifying && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {verifying ? 'Checking…' : isLogin ? 'Sign in' : 'Verify and continue'}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-300 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={send}
          disabled={sending || cooldown > 0}
          className="inline-flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300 hover:underline disabled:opacity-50 disabled:no-underline"
        >
          <RotateCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
          {sending ? 'Sending…' : cooldown > 0 ? `Send new code (${cooldown}s)` : 'Send new code'}
        </button>
      </div>
    </div>
  );
}
