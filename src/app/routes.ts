import { createBrowserRouter } from 'react-router';
import Root from './layouts/Root';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import StudentDashboard from './pages/StudentDashboard';
import WelcomePage from './pages/WelcomePage';
import RequestForm from './pages/RequestForm';
import SchedulingPage from './pages/SchedulingPage';
import TrackingPage from './pages/TrackingPage';
import PaymentPage from './pages/PaymentPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRequests from './pages/admin/AdminRequests';
import AdminScheduling from './pages/admin/AdminScheduling';
import AdminPayments from './pages/admin/AdminPayments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminWelcomePage from './pages/admin/AdminWelcomePage';
import { ROUTER_BASENAME } from './lib/basePath';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: 'login', Component: LoginPage },
      { path: 'register', Component: RegisterPage },
      { path: 'auth/callback', Component: AuthCallbackPage },
      {
        Component: StudentLayout,
        children: [
          { path: 'welcome', Component: WelcomePage },
          { path: 'dashboard', Component: StudentDashboard },
          { path: 'request', Component: RequestForm },
          { path: 'schedule', Component: SchedulingPage },
          { path: 'track', Component: TrackingPage },
          { path: 'payment', Component: PaymentPage },
          { path: 'notifications', Component: NotificationsPage },
        ],
      },
      {
        path: 'admin',
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: 'welcome', Component: AdminWelcomePage },
          { path: 'requests', Component: AdminRequests },
          { path: 'scheduling', Component: AdminScheduling },
          { path: 'payments', Component: AdminPayments },
          { path: 'users', Component: AdminUsers },
          { path: 'documents', Component: AdminDocuments },
          { path: 'reports', Component: AdminReports },
        ],
      },
    ],
  },
], { basename: ROUTER_BASENAME });
