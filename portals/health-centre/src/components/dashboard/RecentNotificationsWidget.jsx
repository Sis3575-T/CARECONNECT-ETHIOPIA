import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Check
} from 'lucide-react';
import { Badge } from '@shared/components/display/Badge.jsx';
import { Skeleton } from '@shared/components/feedback/Skeleton.jsx';
import { healthCentreService } from '../../services/healthCentreService.js';

function formatNotificationTime(timestamp) {
  if (!timestamp) return 'Just now';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function RecentNotificationsWidget({
  initialNotifications = [],
  loading = false,
  onNotificationRead
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  // Sync state if prop changes
  React.useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await healthCentreService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      if (onNotificationRead) {
        onNotificationRead(id);
      }
    } catch (err) {
      console.error('[RecentNotificationsWidget] Failed to mark read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read_at).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Facility Notifications
              </h4>
              <p className="text-[11px] text-slate-400">Live operational & clinical alerts</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 text-[10px] font-bold">
              {unreadCount} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-2" role="status" aria-label="Loading notifications">
            <Skeleton height="50px" className="rounded-xl" />
            <Skeleton height="50px" className="rounded-xl" />
            <Skeleton height="50px" className="rounded-xl" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No recent notifications
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              You are all caught up with facility alerts
            </p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {notifications.slice(0, 4).map((n) => {
              const isUnread = !n.is_read && !n.read_at;
              return (
                <div
                  key={n.id}
                  className={`group p-3 rounded-xl border text-xs transition-all relative ${
                    isUnread
                      ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-200/80 dark:border-sky-900/60 font-medium'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-sky-500 shrink-0"
                            aria-label="Unread notification"
                          />
                        )}
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {n.title || 'Referral Update'}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {n.message || n.body || 'Referral status changed.'}
                      </p>
                    </div>

                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                        className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 p-1 rounded-md shrink-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-800 text-[10px] text-slate-400">
                    <span className="capitalize">{n.category || 'Clinical'}</span>
                    <span>{formatNotificationTime(n.created_at || n.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentNotificationsWidget;
