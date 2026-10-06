import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Mail, RotateCw } from 'lucide-react';
import { useAuth, type User } from '../context/AuthContext';

const RESEND_SECONDS = 60;

const fieldClass =
  'w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 text-sm';

interface Props {
  initialEmail?: string;
  onDone: (user?: User) => void;
  onBack: () => void;
}

export function ForgotPassword({ initialEmail = '', onDone, onBack }: Props) {
  const { resetPassword, resetPasswordWithCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(s => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter the email you used for your account.');
      return;
    }
    setBusy(true);
    const result = await resetPassword(email);
    setBusy(false);
    setCooldown(RESEND_SECONDS);
    if (!result.success) {
      setError(result.error || 'Could not send the code.');
      return;
    }
    setStep('code');
    setInfo(`Reset code sent to ${email.trim()}. Check your Inbox and Spam folder. If nothing arrives in 2 minutes, make sure this is the email you registered with.`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const clean = code.replace(/\D/g, '');
    if (clean.length < 6) {
      setError('Enter the full code from the email.');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await resetPasswordWithCode(email, clean, password);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not reset your password.');
      return;
    }
    onDone(result.user);
  };

  return (
    <div>
      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <KeyRound className="w-6 h-6 text-blue-700 dark:text-blue-300" />
      </div>
      <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.45rem', fontWeight: 600 }}>
        Reset password
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-5 leading-relaxed">
        {step === 'email'
          ? 'Enter the email of your account. We will send a reset code to your Gmail.'
          : 'Enter the code from the email, then choose a new password. Check Spam or Promotions if you don’t see it.'}
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

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reset-email"
                type="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className={`${fieldClass} pl-10`}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy || cooldown > 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 text-white rounded-lg font-semibold bg-blue-800 hover:bg-blue-900 transition-colors"
          >
            {busy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {busy ? 'Sending…' : cooldown > 0 ? `Send reset code (${cooldown}s)` : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Code sent to <span className="font-semibold text-gray-900 dark:text-white break-all">{email.trim()}</span>
          </p>
          <div>
            <label htmlFor="reset-code" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Reset code</label>
            <input
              id="reset-code"
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
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">New password</label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={`${fieldClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Confirm new password</label>
            <input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Type it again"
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 text-white rounded-lg font-semibold bg-blue-800 hover:bg-blue-900 transition-colors"
          >
            {busy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {busy ? 'Saving…' : 'Reset password and sign in'}
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-300 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign in
        </button>
        {step === 'code' && (
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={busy || cooldown > 0}
            className="inline-flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            <RotateCw className="w-3.5 h-3.5" />
            {cooldown > 0 ? `Send new code (${cooldown}s)` : 'Send new code'}
          </button>
        )}
      </div>
    </div>
  );
}
