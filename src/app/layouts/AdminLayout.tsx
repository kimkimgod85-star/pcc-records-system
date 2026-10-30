import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminAlertToasts } from '../components/AdminAlerts';
import { useAuth } from '../context/AuthContext';
import { useAdminAlerts } from '../lib/adminAlerts';
import { useDeviceNotificationListener } from '../lib/deviceNotifications';
import { OverduePickupsProvider } from '../lib/overduePickups';

const ADMIN_FONT_SIZE = '18px';

export default function AdminLayout() {
  const { user, isAuthenticated, ready } = useAuth();
  const location = useLocation();
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const { alerts, dismiss } = useAdminAlerts(isAdmin);
  useDeviceNotificationListener(isAdmin ? user?.id : undefined);

  useEffect(() => {
    const root = document.documentElement;
    const wide = window.matchMedia('(min-width: 1024px)');
    const apply = () => root.style.setProperty('--font-size', wide.matches ? ADMIN_FONT_SIZE : '16px');
    apply();
    wide.addEventListener('change', apply);
    return () => {
      wide.removeEventListener('change', apply);
      root.style.removeProperty('--font-size');
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-gray-50 dark:bg-slate-950" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <OverduePickupsProvider enabled={isAdmin}>
      <div className="admin-readable flex h-dvh bg-gray-50 dark:bg-slate-950 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0 safe-area-pb">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
        <AdminAlertToasts alerts={alerts} onDismiss={dismiss} />
      </div>
    </OverduePickupsProvider>
  );
}
