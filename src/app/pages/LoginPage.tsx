import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, AlertCircle, LogIn, ArrowLeft, Mail, Lock, ShieldCheck, UserX, Clock, Phone } from 'lucide-react';
import { DEACTIVATED_MESSAGE, isDeactivatedMessage, UNREGISTERED_GOOGLE_MESSAGE, useAuth, type LoginPortal } from '../context/AuthContext';
import { EmailCodeVerify } from '../components/EmailCodeVerify';
import { ForgotPassword } from '../components/ForgotPassword';
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
  'w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 focus:bg-white text-sm';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() =>
    searchParams.get('reason') === 'unregistered' ? UNREGISTERED_GOOGLE_MESSAGE
    : searchParams.get('reason') === 'deactivated' ? DEACTIVATED_MESSAGE
    : '',
  );
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [loginCodeEmail, setLoginCodeEmail] = useState<string | null>(null);
  const [forgotState, setForgotOpen] = useState(() => searchParams.get('forgot') === '1');
  const portal: LoginPortal = ['staff', 'admin', 'registrar'].includes(searchParams.get('as') || '') ? 'staff' : 'student';
  const isStaff = portal === 'staff';
  const forgotOpen = forgotState && !isStaff;

  const switchPortal = (next: LoginPortal) => {
    if (next === portal) return;
    setError('');
    setInfo('');
    setForm({ email: '', password: '' });
    setShowPassword(false);
    setVerifyEmail(null);
    setLoginCodeEmail(null);
    setForgotOpen(false);
    setSearchParams(next === 'staff' ? { as: 'staff' } : {}, { replace: true });
  };

  const goToApp = (role?: string, userId?: string) => {
    if (role === 'admin') navigate(userId ? adminHome(userId) : '/admin');
    else navigate(userId ? studentHome(userId) : '/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const result = await login(form.email, form.password, portal);
    setLoading(false);
    if (result.success) goToApp(result.user?.role, result.user?.id);
    else if (result.needsLoginCode) setLoginCodeEmail(form.email.trim());
    else if (result.needsVerification) setVerifyEmail(form.email.trim());
    else setError(result.error || 'Login failed.');
  };

  const handleForgot = () => {
    setError('');
    setInfo('');
    setForgotOpen(true);
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
    <div className="h-svh overflow-hidden grid lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,30rem)] bg-white dark:bg-slate-950">
      <aside className="relative hidden lg:block">
        <img src={PCC_BG_URL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className={`absolute inset-0 ${isStaff ? 'bg-gradient-to-br from-[#050d24]/95 via-[#0b245c]/88 to-[#123a8a]/80' : 'bg-gradient-to-br from-[#071a45]/92 via-[#0c2f78]/82 to-[#1e4ed8]/72'}`} />
        <div className="relative h-full flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <img src={PCC_LOGO_URL} alt="PCC logo" className="h-14 w-auto object-contain bg-white rounded-2xl p-1.5" />
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Pagadian Capitol Colleges</p>
              <p className="text-xs text-blue-100 mt-0.5">Registrar’s Office</p>
            </div>
          </div>
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-100">{isStaff ? 'Staff portal' : 'Student portal'}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {isStaff ? 'Sign in for the Registrar and Admin.' : 'Request your school records online.'}
            </h1>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed">
              {isStaff
                ? 'This entrance is only for authorized staff. Student accounts stay on the student sign-in.'
                : 'Students and alumni can request a record, pay, message the office, and book a pickup.'}
            </p>
          </div>
          <p className="text-xs text-blue-100/80">Monday to Saturday, 8:00 AM – 4:00 PM</p>
        </div>
      </aside>

      <div className="h-svh overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center px-5 sm:px-8 py-5">
          <div className="w-full max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-4">
              {isStaff ? (
                <button type="button" onClick={() => switchPortal('student')} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                  <ArrowLeft className="w-3.5 h-3.5" /> Student sign in
                </button>
              ) : (
                <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                  <ArrowLeft className="w-3.5 h-3.5" /> Home
                </Link>
              )}
              <div className="lg:hidden flex items-center gap-2">
                <img src={PCC_LOGO_URL} alt="PCC logo" className="h-9 w-auto object-contain" />
              </div>
            </div>

            {forgotOpen ? (
              <ForgotPassword
                initialEmail={form.email}
                onDone={done => goToApp(done?.role, done?.id)}
                onBack={() => setForgotOpen(false)}
              />
            ) : loginCodeEmail ? (
              <EmailCodeVerify
                email={loginCodeEmail}
                purpose="login"
                onVerified={verified => goToApp(verified?.role, verified?.id)}
                onBack={() => {
                  setLoginCodeEmail(null);
                  setForm(f => ({ ...f, password: '' }));
                }}
              />
            ) : verifyEmail ? (
              <EmailCodeVerify
                email={verifyEmail}
                sendOnOpen
                onVerified={verified => goToApp(verified?.role, verified?.id)}
                onBack={() => setVerifyEmail(null)}
              />
            ) : (
            <>
            <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.65rem', fontWeight: 600 }}>
              {isStaff ? 'Staff sign in' : 'Sign in'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              {isStaff ? 'Registrar and Admin accounts only.' : 'Use your PCC student or alumni account.'}
            </p>

            {error && isDeactivatedMessage(error) && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-red-800 dark:text-red-200">Account deactivated</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-0.5 leading-snug">
                      This account was deactivated by the Registrar / Admin, so you can’t sign in or make requests right now.
                      Please proceed to the Registrar’s Office to have your account reviewed. Bring a valid ID.
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-red-200/70 dark:border-red-800/60 bg-white/60 dark:bg-slate-900/30 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500 flex-shrink-0" /> Mon–Sat, 8:00 AM – 4:00 PM</p>
                  <p className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a href="mailto:registrar@pcci.ph.education" className="text-blue-800 dark:text-blue-300 hover:underline break-all">registrar@pcci.ph.education</a>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a href="tel:+639187272849" className="text-blue-800 dark:text-blue-300 hover:underline">0918 727 2849</a>
                  </p>
                </div>
              </div>
            )}
            {error && !isDeactivatedMessage(error) && (
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

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder={isStaff ? 'staff@email.com' : 'you@email.com'}
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Password</label>
                  {!isStaff && (
                    <button type="button" onClick={handleForgot} className="text-xs font-medium text-blue-800 dark:text-blue-300 hover:underline">
                      Forgot password?
                    </button>
                  )}
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
                className="w-full h-11 flex items-center justify-center gap-2 disabled:opacity-60 text-white rounded-xl font-semibold bg-blue-800 hover:bg-blue-900 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Signing in...' : isStaff ? 'Sign in as staff' : 'Sign in'}
              </button>
            </form>

            {isStaff ? (
              <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                Staff accounts are issued by the administrator.
              </p>
            ) : (
            <>
            <div className="relative my-3">
              <div className="absolute inset-x-0 top-1/2 border-t border-gray-200 dark:border-slate-700" aria-hidden />
              <span className="relative mx-auto flex w-fit bg-white dark:bg-slate-950 px-3 text-[11px] uppercase tracking-wide text-gray-400">or</span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              title="Google works only if you already created an account."
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
              New student?{' '}
              <Link to="/register" className="font-semibold text-blue-800 dark:text-blue-300 hover:underline">Create an account</Link>
            </p>
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              <Link to="/terms" className="underline underline-offset-2">Terms of Use</Link>
              {' · '}
              <Link to="/terms#collect" className="underline underline-offset-2">Privacy Notice</Link>
            </p>
            <button
              type="button"
              onClick={() => switchPortal('staff')}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Staff / Registrar sign in
            </button>
            </>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
