import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, AlertCircle, LogIn, ArrowLeft, Mail, Lock } from 'lucide-react';
import { UNREGISTERED_GOOGLE_MESSAGE, useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { studentHome } from './WelcomePage';
import { adminHome } from './admin/AdminWelcomePage';
import { withBase } from '../lib/basePath';

const PCC_LOGO_URL = withBase('PCC%20LOGO.png');
const PCC_BG_URL = withBase('PCC1.jpg');

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.4 0 19.6-8 19.6-19.5 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-1.7 13.6-4.7l-6.3-5.3C29.3 35.9 26.8 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.7 7.3l6.3 5.3C38.2 37.4 44 32 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

const fieldClass =
  'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 text-sm';

export default function LoginPage() {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() =>
    searchParams.get('reason') === 'unregistered' ? UNREGISTERED_GOOGLE_MESSAGE : '',
  );
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const goToApp = (role?: string, userId?: string) => {
    if (role === 'admin') navigate(userId ? adminHome(userId) : '/admin');
    else navigate(userId ? studentHome(userId) : '/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) goToApp(result.user?.role, result.user?.id);
    else setError(result.error || 'Login failed.');
  };

  const handleForgot = async () => {
    setError('');
    setInfo('');
    const result = await resetPassword(form.email);
    if (result.success) setInfo('If that email has an account, a reset link was sent.');
    else setError(result.error || 'Could not send reset email.');
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const result = await loginWithGoogle();
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-svh flex flex-col relative isolate">
      <div
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url(${PCC_BG_URL})` }}
      />
      <div className="absolute inset-0 -z-10 bg-white/85 dark:bg-slate-950/85 backdrop-blur-[2px]" />

      <Header variant="landing" />

      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-800 grid md:grid-cols-[220px_1fr]">
          <aside className="hidden md:flex flex-col justify-between bg-blue-800 text-white p-6">
            <div>
              <img src={PCC_LOGO_URL} alt="PCC logo" className="h-14 w-auto object-contain mb-5 drop-shadow" />
              <p className="text-[12px] uppercase tracking-[0.18em] text-blue-200">Registrar’s Office</p>
              <h2 className="mt-2 text-xl font-semibold leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                School records, without the queue.
              </h2>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed">
              Students and alumni of Pagadian Capitol Colleges can request documents and book pickup here.
            </p>
          </aside>

          <div className="p-5 sm:p-7">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:underline mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back Home Page
            </Link>

            <div className="md:hidden flex items-center gap-3 mb-4">
              <img src={PCC_LOGO_URL} alt="PCC logo" className="h-10 w-auto object-contain" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>PCC Records</p>
                <p className="text-xs text-gray-500">Registrar’s Office</p>
              </div>
            </div>

            <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.45rem', fontWeight: 600 }}>
              Sign in
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
              Use your PCC account to request and track records.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {info && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">{info}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Password</label>
                  <button type="button" onClick={handleForgot} className="text-xs font-medium text-blue-800 dark:text-blue-300 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 text-white rounded-lg font-semibold bg-blue-800 hover:bg-blue-900 transition-colors"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
              <span className="text-[12px] uppercase tracking-wide text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Google works only if you already created an account.
            </p>

            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              New here?{' '}
              <Link to="/register" className="text-blue-800 dark:text-blue-300 hover:underline font-semibold">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
