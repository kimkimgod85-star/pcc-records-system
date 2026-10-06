import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { EmailCodeVerify } from '../components/EmailCodeVerify';
import { useAuth } from '../context/AuthContext';
import { withBase } from '../lib/basePath';

const PCC_LOGO_URL = withBase('PCC%20LOGO.png');
const PCC_BG_URL = withBase('PCC1.jpg');

const fieldClass =
  'w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 text-sm';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

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

            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
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
