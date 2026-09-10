import { useState, useEffect } from "react";
import { notificationApi } from "../services/api.js";
import { useAuth } from "./useAuth.js";
import { NotificationContext } from "./useNotification.js";

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    if (isAuthenticated) {
      const fetchCount = () => {
        notificationApi
          .getUnreadCount()
          .then((res) => {
            if (!active) return;
            const count =
              res?.unread_count !== undefined
                ? Number(res.unread_count)
                : res?.count !== undefined
                ? Number(res.count)
                : res?.unread !== undefined
                ? Number(res.unread)
                : 0;
            setUnreadCount(isNaN(count) ? 0 : count);
          })
          .catch(() => {});
      };

      fetchCount();

      const interval = setInterval(fetchCount, 45000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }
  }, [isAuthenticated]);

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
      throw err;
    }
  };

  const decrementUnread = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const refreshUnread = () => {
    if (isAuthenticated) {
      notificationApi
        .getUnreadCount()
        .then((res) => {
          const count =
            res?.unread_count !== undefined
              ? Number(res.unread_count)
              : res?.count !== undefined
              ? Number(res.count)
              : res?.unread !== undefined
              ? Number(res.unread)
              : 0;
          setUnreadCount(isNaN(count) ? 0 : count);
        })
        .catch(() => {});
    }
  };

  const value = {
    unreadCount,
    refreshUnread,
    markAllRead,
    decrementUnread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
