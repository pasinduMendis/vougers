'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';

interface NotificationListProps {
  clientId?: string;
  organizationId?: string;
  userType: 'client' | 'provider';
  className?: string;
}

export function NotificationList({
  clientId,
  organizationId,
  userType,
  className,
}: NotificationListProps) {
  const router = useRouter();

  const {
    notifications,
    pagination,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    addNotification,
    setPage,
    refresh,
  } = useNotifications({ limit: 20 });

  const {
    count: unreadCount,
    increment: incrementUnread,
    decrement: decrementUnread,
    reset: resetUnread,
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

  if (error) {
    return (
      <Card variant="bordered" className={className}>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="h-12 w-12 text-red-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refresh()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered" className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Notifications</CardTitle>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            Mark all as read
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="h-16 w-16 text-slate-300 mb-4"
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
            <p className="text-lg font-medium text-slate-700">No notifications</p>
            <p className="text-sm text-slate-500 mt-1">
              You&apos;ll be notified when there&apos;s activity on your quotes
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div key={notification._id} className="px-4">
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onClick={() => handleNotificationClick(notification)}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-4 border-t border-slate-100">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
