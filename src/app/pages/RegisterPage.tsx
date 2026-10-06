import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';

const PCC_LOGO_URL = '/PCC%20LOGO.png';
const PCC_BG_URL = '/PCC1.jpg';

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
  'w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 text-sm';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {needsConfirm ? 'Account created' : 'Registration Successful!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {needsConfirm
              ? 'Supabase still requires email confirmation. Open Authentication → Providers → Email, turn Confirm email OFF, Save, then Sign in with this email and password.'
              : 'Opening your dashboard...'}
          </p>
          {needsConfirm && (
            <Link to="/login" className="inline-block mt-4 text-sm font-semibold text-blue-800 hover:underline">
              Go to Sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex flex-col relative isolate">
      <div
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url(${PCC_BG_URL})` }}
      />
      <div className="absolute inset-0 -z-10 bg-white/85 dark:bg-slate-950/85 backdrop-blur-[2px]" />

      <Header variant="landing" />

      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-800">
          <div className="bg-blue-800 px-5 py-3.5 flex items-center gap-3">
            <img src={PCC_LOGO_URL} alt="PCC logo" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Create account</p>
              <p className="text-[12px] text-blue-100">PCC Records Request System</p>
            </div>
          </div>

          <div className="px-5 py-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:underline mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back Home Page
            </Link>

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['student', 'alumni'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm({ ...form, role })}
                      className={`py-2 px-3 rounded-lg border text-sm font-semibold capitalize ${
                        form.role === role
                          ? 'bg-blue-800 border-blue-800 text-white'
                          : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {role === 'student' ? 'Student' : 'Alumni'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">
                  Student ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                  placeholder="2021-0001"
                  className={fieldClass}
                />
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 disabled:opacity-60 text-white rounded-lg font-semibold bg-blue-800 hover:bg-blue-900 transition-colors"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-3">
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
              Create account with Google
            </button>
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Fill your name and Student / Alumni first. Google will not skip registration.
            </p>

            <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
              Already registered?{' '}
              <Link to="/login" className="text-blue-800 dark:text-blue-300 hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
