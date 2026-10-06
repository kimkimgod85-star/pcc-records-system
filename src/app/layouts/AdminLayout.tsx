import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminAlertToasts } from '../components/AdminAlerts';
import { useAuth } from '../context/AuthContext';
import { useAdminAlerts } from '../lib/adminAlerts';
import { useDeviceNotificationListener } from '../lib/deviceNotifications';

const ADMIN_FONT_SIZE = '18px';

export default function AdminLayout() {
  const { user, isAuthenticated, ready } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const { alerts, dismiss } = useAdminAlerts(isAdmin);
  useDeviceNotificationListener(isAdmin ? user?.id : undefined);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-size', ADMIN_FONT_SIZE);
    return () => {
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
    <div className="flex h-dvh bg-gray-50 dark:bg-slate-950 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0 safe-area-pb">
        <Outlet />
      </main>
      <AdminAlertToasts alerts={alerts} onDismiss={dismiss} />
    </div>
  );
}
