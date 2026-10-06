import { useEffect, useState } from 'react';
import { fetchUnreadCount, subscribeNotifications } from './notifications';

export function useUnreadNotifications(userId?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    let alive = true;
    const refresh = () => {
      void fetchUnreadCount(userId).then(next => { if (alive) setCount(next); });
    };
    refresh();
    const stop = subscribeNotifications(refresh);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      stop();
      window.removeEventListener('focus', onFocus);
    };
  }, [userId]);

  return count;
}
