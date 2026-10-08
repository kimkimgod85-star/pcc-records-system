import { Outlet, Navigate, useLocation } from 'react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileNav } from '../components/MobileNav';
import { useAuth } from '../context/AuthContext';
import { useDeviceNotificationListener } from '../lib/deviceNotifications';

export default function StudentLayout() {
  const { user, isAuthenticated, ready } = useAuth();
  const location = useLocation();
  useDeviceNotificationListener(isAuthenticated ? user?.id : undefined);

  if (!ready) {
    return <div className="min-h-screen bg-gray-50 dark:bg-slate-900" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <Header variant="app" />
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
}
