'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/Button';

interface NotificationBellProps {
  clientId?: string;
  organizationId?: string;
  userType: 'client' | 'provider';
  className?: string;
}

export function NotificationBell({
  clientId,
  organizationId,
  userType,
  className,
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    addNotification,
    refresh,
  } = useNotifications({ limit: 5 });

  const {
    count: unreadCount,
    increment: incrementUnread,
    decrement: decrementUnread,
    reset: resetUnread,
    refresh: refreshCount,
  } = useUnreadCount();

  // Subscribe to real-time notifications
  useNotificationSubscription({
    clientId,
    organizationId,
    callbacks: {
      onNewNotification: (notification) => {
        addNotification(notification);
        incrementUnread();
      },
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const success = await markAsRead(id);
    if (success) {
      decrementUnread();
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      resetUnread();
    }
  };

  const handleNotificationClick = (notification: { quoteId?: string; quoteRequestId?: string }) => {
    setIsOpen(false);

    // Navigate based on notification type and user
    if (userType === 'client') {
      if (notification.quoteRequestId) {
        router.push(`/client/quotes/${notification.quoteRequestId}`);
      } else {
        router.push('/client/quotes');
      }
    } else {
      if (notification.quoteId) {
        router.push(`/provider/quotes?highlight=${notification.quoteId}`);
      } else {
        router.push('/provider/quotes');
      }
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push(userType === 'client' ? '/client/notifications' : '/provider/notifications');
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="h-12 w-12 text-slate-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onClick={() => handleNotificationClick(notification)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleViewAll}
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
