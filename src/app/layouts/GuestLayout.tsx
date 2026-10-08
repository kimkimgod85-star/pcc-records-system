import { Outlet, Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { studentHome } from '../pages/WelcomePage';
import { adminHome } from '../pages/admin/AdminWelcomePage';

export default function GuestLayout() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="min-h-screen bg-gray-50 dark:bg-slate-900" />;
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? adminHome(user.id) : studentHome(user.id)} replace />;
  }

  return (
    <div key={location.pathname} className="fade-in">
      <Outlet />
    </div>
  );
}
