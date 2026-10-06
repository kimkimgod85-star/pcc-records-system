import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Menu, X, Sun, Moon, Bell, User, LogOut, ChevronDown, GraduationCap,
  LayoutDashboard, FilePlus2, CalendarDays, Radar,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useUnreadNotifications } from '../lib/useUnreadNotifications';

const PCC_LOGO_URL = '/PCC%20LOGO.png';

interface HeaderProps {
  variant?: 'landing' | 'app';
}

export function Header({ variant = 'app' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const unread = useUnreadNotifications(user?.id);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const close = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  const isPublicAuth = location.pathname === '/login' || location.pathname === '/register';
  const overHero = variant === 'landing' && !scrolled && !isPublicAuth;

  const navLinks = isAuthenticated
    ? [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Request Records', href: '/request', icon: FilePlus2 },
        { label: 'Schedule', href: '/schedule', icon: CalendarDays },
        { label: 'Track Request', href: '/track', icon: Radar },
      ]
    : [];

  useLayoutEffect(() => {
    const measure = () => {
      const active = navRef.current?.querySelector<HTMLElement>(`[data-nav-href="${location.pathname}"]`);
      setIndicator(active && active.offsetWidth > 0 ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [location.pathname, isAuthenticated]);

  const mobileLinks = isAuthenticated
    ? [
        ...navLinks.map(({ label, href }) => ({ label, href })),
        { label: 'Payments', href: '/payment' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'How to Use', href: '/welcome' },
      ]
    : [];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 backdrop-blur-xl backdrop-saturate-150 ${
      overHero
        ? 'bg-white/45 dark:bg-slate-900/45 shadow-none border-white/50 dark:border-white/10'
        : scrolled
          ? 'bg-white/65 dark:bg-slate-900/70 shadow-md border-white/60 dark:border-slate-700/60'
          : 'bg-white/55 dark:bg-slate-900/60 shadow-sm border-white/50 dark:border-slate-700/50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src={PCC_LOGO_URL}
              alt="PCC logo"
              className="h-10 sm:h-11 w-auto object-contain flex-shrink-0"
              loading="eager"
              decoding="async"
            />
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Pagadian Capitol Colleges
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Records System</p>
            </div>
          </Link>

          <nav ref={navRef} className="hidden lg:flex items-center gap-1 relative">
            <span
              aria-hidden
              className={`absolute top-0 h-full rounded-xl bg-blue-100 dark:bg-blue-900/40 shadow-sm ring-1 ring-blue-200/70 dark:ring-blue-700/50 transition-all duration-300 ease-out motion-reduce:transition-none ${
                indicator ? 'opacity-100' : 'opacity-0'
              }`}
              style={indicator ? { left: indicator.left, width: indicator.width } : undefined}
            />
            {navLinks.map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  data-nav-href={link.href}
                  className={`group relative z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 active:scale-95 ${
                    active
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-gray-800 hover:text-blue-800 dark:text-gray-200 dark:hover:text-white'
                  }`}
                >
                  <link.icon
                    className={`w-4 h-4 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110 ${
                      active ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-300'
                    }`}
                  />
                  {link.label}
                  {!active && (
                    <span
                      aria-hidden
                      className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-800 hover:text-blue-800 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/notifications"
                  aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                  className={`relative p-2 rounded-lg transition-colors ${
                    isActive('/notifications')
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-gray-800 hover:text-blue-800 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center rounded-full ring-2 ring-white dark:ring-slate-900">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs capitalize">
                          {user?.role}
                        </span>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <User className="w-4 h-4" /> My Dashboard
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          <GraduationCap className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                    isActive('/login')
                      ? 'bg-blue-800 text-white border-blue-800'
                      : 'bg-white text-gray-800 border-gray-400 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-800 dark:bg-transparent dark:text-gray-100 dark:border-slate-500 dark:hover:bg-slate-800'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                    isActive('/register')
                      ? 'bg-blue-800 text-white border-blue-800'
                      : isActive('/login')
                        ? 'bg-white text-gray-800 border-gray-400 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-800 dark:bg-transparent dark:text-gray-100 dark:border-slate-500 dark:hover:bg-slate-800'
                        : 'bg-blue-700 text-white border-blue-700 hover:bg-blue-900 hover:border-blue-900'
                  }`}
                >
                  Register
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open menu"
              className={`${isAuthenticated ? 'lg:hidden' : 'md:hidden'} p-2 rounded-lg text-gray-800 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={`${isAuthenticated ? 'lg:hidden' : 'md:hidden'} border-t border-white/50 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-3 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto`}>
          {mobileLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center justify-between">
                {link.label}
                {link.href === '/notifications' && unread > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[12px] font-bold leading-5 text-center rounded-full">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="pt-2 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex-1 text-center px-4 py-2 border text-sm font-semibold rounded-lg ${
                  isActive('/login')
                    ? 'bg-blue-800 text-white border-blue-800'
                    : 'bg-white text-gray-800 border-gray-400 hover:bg-blue-50 hover:text-blue-800'
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex-1 text-center px-4 py-2 border text-sm font-semibold rounded-lg ${
                  isActive('/register')
                    ? 'bg-blue-800 text-white border-blue-800'
                    : isActive('/login')
                      ? 'bg-white text-gray-800 border-gray-400 hover:bg-blue-50 hover:text-blue-800'
                      : 'bg-blue-700 text-white border-blue-700 hover:bg-blue-900'
                }`}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
