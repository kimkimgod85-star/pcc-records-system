import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, FileText, Calendar,
  CreditCard, Users, BarChart3, Banknote, LogOut, Menu, X, Sun, Moon, ChevronRight, BookOpen
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { withBase } from '../lib/basePath';
import { AdminAlertSettings } from './AdminAlerts';

const PCC_LOGO_URL = withBase('PCC%20LOGO.png');

export function AdminSidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Manage Requests', icon: FileText, href: '/admin/requests' },
    { label: 'Scheduling', icon: Calendar, href: '/admin/scheduling' },
    { label: 'Payments', icon: CreditCard, href: '/admin/payments' },
    { label: 'Document Fees', icon: Banknote, href: '/admin/documents' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Reports', icon: BarChart3, href: '/admin/reports' },
    { label: 'Guide', icon: BookOpen, href: '/admin/welcome' },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 p-4 border-b border-gray-200 dark:border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src={PCC_LOGO_URL}
          alt="PCC logo"
          className={`${collapsed ? 'h-9' : 'h-10'} w-auto object-contain flex-shrink-0`}
          loading="eager"
          decoding="async"
        />
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              PCC Admin
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Registrar Portal</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isActive(item.href)
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
            {!collapsed && isActive(item.href) && <ChevronRight className="w-3 h-3 ml-auto" />}
          </Link>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-700 space-y-1">
        {/* User Info */}
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white font-medium">{user?.name?.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        )}

        {user && <AdminAlertSettings userId={user.id} collapsed={collapsed} />}

        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile / Tablet Top Bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 px-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src={PCC_LOGO_URL} alt="PCC logo" className="h-8 w-auto object-contain" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
            PCC Admin
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
            {navItems.find(item => isActive(item.href))?.label || 'Registrar Portal'}
          </p>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-xl transform transition-transform ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute top-4 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className={`relative hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-dvh sticky top-0`}>
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm z-10"
        >
          <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        <SidebarContent />
      </div>
    </>
  );
}
