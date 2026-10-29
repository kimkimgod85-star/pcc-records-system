import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { EmailCodeVerify } from '../components/EmailCodeVerify';
import { useAuth } from '../context/AuthContext';
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
  'w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 focus:bg-white text-sm';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    studentId: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'alumni',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreeNudge, setAgreeNudge] = useState(false);

  const requireAgreement = () => {
    if (agreed) return true;
    setAgreeNudge(true);
    setError('Please read and agree to the Terms of Use and Privacy Notice first.');
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requireAgreement()) return;

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await register({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      studentId: form.studentId,
      role: form.role,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Registration failed.');
      return;
    }

    setSuccess(true);
    if (result.needsEmailConfirm) {
      setNeedsConfirm(true);
      return;
    }
    window.setTimeout(() => navigate('/welcome'), 1200);
  };

  const handleGoogle = async () => {
    setError('');
    if (!requireAgreement()) return;
    if (!form.fullName.trim()) {
      setError('Enter your full name first, then continue with Google.');
      return;
    }
    setLoading(true);
    const result = await loginWithGoogle('register', {
      fullName: form.fullName,
      studentId: form.studentId,
      role: form.role,
    });
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Google sign-in failed.');
    }
  };

  if (success && needsConfirm) {
    return (
      <div className="min-h-svh bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl p-5 sm:p-7">
          <EmailCodeVerify
            email={form.email.trim()}
            onVerified={() => navigate('/welcome')}
            onBack={() => navigate('/login')}
            backLabel="Go to Sign in"
          />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Registration Successful!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Opening your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-svh overflow-hidden grid lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,34rem)] bg-white dark:bg-slate-950">
      <aside className="relative hidden lg:block">
        <img src={PCC_BG_URL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#071a45]/92 via-[#0c2f78]/82 to-[#1e4ed8]/72" />
        <div className="relative h-full flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <img src={PCC_LOGO_URL} alt="PCC logo" className="h-14 w-auto object-contain bg-white rounded-2xl p-1.5" />
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Pagadian Capitol Colleges</p>
              <p className="text-xs text-blue-100 mt-0.5">Registrar’s Office</p>
            </div>
          </div>
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-100">Student portal</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Create your PCC account.
            </h1>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed">
              Register with your name and email. The office does not add student accounts by hand.
            </p>
          </div>
          <p className="text-xs text-blue-100/80">Monday to Saturday, 8:00 AM – 4:00 PM</p>
        </div>
      </aside>

      <div className="h-svh overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center px-5 sm:px-8 py-4">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                <ArrowLeft className="w-3.5 h-3.5" /> Home
              </Link>
              <img src={PCC_LOGO_URL} alt="PCC logo" className="h-9 w-auto object-contain lg:hidden" />
            </div>
            <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.65rem', fontWeight: 600 }}>
              Create account
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">Students and alumni of Pagadian Capitol Colleges.</p>

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'alumni'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm({ ...form, role })}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                      form.role === role
                        ? 'bg-blue-800 border-blue-800 text-white'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {role === 'student' ? 'Student' : 'Alumni'}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Full name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Your full name"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Student ID</label>
                <input
                  type="text"
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@email.com"
                  required
                  className={fieldClass}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                    className={`${fieldClass} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    required
                    className={`${fieldClass} pr-10`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => {
                      setAgreed(e.target.checked);
                      if (e.target.checked) {
                        setAgreeNudge(false);
                        setError('');
                      }
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-400 text-blue-800 focus:ring-2 focus:ring-blue-700"
                  />
                  <span className="text-xs leading-snug text-gray-700 dark:text-gray-300">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" rel="noopener" className="text-blue-800 dark:text-blue-300 underline underline-offset-2">Terms of Use</Link>
                    {' '}and{' '}
                    <Link to="/terms#collect" target="_blank" rel="noopener" className="text-blue-800 dark:text-blue-300 underline underline-offset-2">Privacy Notice</Link>.
                  </span>
                </label>
                {agreeNudge && !agreed && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">Tick the box to agree before you create an account.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 disabled:opacity-60 text-white rounded-xl font-semibold bg-blue-800 hover:bg-blue-900 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="relative my-3">
              <div className="absolute inset-x-0 top-1/2 border-t border-gray-200 dark:border-slate-700" aria-hidden />
              <span className="relative mx-auto flex w-fit bg-white dark:bg-slate-950 px-3 text-[11px] uppercase tracking-wide text-gray-400">or</span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              title="Choose Student or Alumni and enter your name first."
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-800 dark:text-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-blue-800 dark:text-blue-300 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
