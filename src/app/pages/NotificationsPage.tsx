import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bell, CheckCircle, Calendar, Package, CreditCard, AlertCircle, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTICE_ICON,
  PAYMENT_NOTICE_ICON,
  subscribeNotifications,
  type AppNotification,
} from '../lib/notifications';
import { formatLongDate, timeAgo } from '../lib/status';
import { DeviceNotificationCard } from '../components/DeviceNotificationPrompt';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const reload = () => {
    if (!user) return;
    fetchNotifications(user.id).then(setNotifications);
  };

  useEffect(() => {
    reload();
    return subscribeNotifications(reload);
  }, [user]);

  const [actionError, setActionError] = useState('');
  const unreadCount = notifications.filter(n => !n.read).length;

  const run = async (optimistic: (list: AppNotification[]) => AppNotification[], action: () => Promise<void>) => {
    const before = notifications;
    setActionError('');
    setNotifications(optimistic);
    try {
      await action();
    } catch (err) {
      setNotifications(before);
      setActionError(err instanceof Error ? `Could not update notifications: ${err.message}` : 'Could not update notifications.');
    }
  };

  const markAllRead = () => {
    if (!user) return;
    void run(list => list.map(n => ({ ...n, read: true })), () => markAllNotificationsRead(user.id));
  };
  const markRead = (id: string) => {
    if (notifications.find(n => n.id === id)?.read) return;
    void run(list => list.map(n => n.id === id ? { ...n, read: true } : n), () => markNotificationRead(id));
  };
  const dismiss = (id: string) => {
    void run(list => list.filter(n => n.id !== id), () => dismissNotification(id));
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 dark:text-white">Notifications</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                You have <span className="text-blue-600 dark:text-blue-400 font-medium">{unreadCount} unread</span> notifications
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {user && (
        <div className="mb-5">
          <DeviceNotificationCard userId={user.id} />
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { value: 'all', label: `All (${notifications.length})` },
          { value: 'unread', label: `Unread (${unreadCount})` },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as 'all' | 'unread')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No notifications to show.</p>
          </div>
        ) : (
          filtered.map(notif => {
              const look = notif.type === 'payment' && notif.title.toLowerCase().includes('verified')
                ? PAYMENT_NOTICE_ICON
                : (NOTICE_ICON[notif.type] || NOTICE_ICON.info);
              const Icon = look.icon;
              return (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={`relative flex gap-4 p-4 rounded-2xl border transition-all ${
                !notif.read
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 cursor-pointer'
                  : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
              }`}
            >
              {/* Unread Dot */}
              {!notif.read && (
                <div className="absolute top-4 right-10 w-2 h-2 bg-red-500 rounded-full" />
              )}

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${look.iconBg}`}>
                <Icon className={`w-5 h-5 ${look.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                    {notif.title}
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
                    aria-label="Dismiss notification"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)} · {formatLongDate(notif.createdAt)}</span>
                  <Link
                    to={notif.link}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View details
                  </Link>
                  {!notif.read && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(notif.id); }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
              );
          })
        )}
      </div>
    </div>
  );
}
