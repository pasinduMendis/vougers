'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { NotificationList } from '@/components/notifications';

export default function ProviderNotificationsPage() {
  const { user } = useAuth();
  const { reset: resetUnreadCount } = useUnreadCount();
  const hasMarkedAsRead = useRef(false);

  // Mark all notifications as read when visiting this page
  // This clears the badge from sidebar, mobile nav, and header bell
  // and persists the read status in the database
  useEffect(() => {
    const markAllAsRead = async () => {
      if (hasMarkedAsRead.current) return;
      hasMarkedAsRead.current = true;

      try {
        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'PATCH',
          credentials: 'include',
        });

        if (response.ok) {
          resetUnreadCount();
        }
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    };

    // Small delay to allow the page to render first
    const timer = setTimeout(markAllAsRead, 500);
    return () => clearTimeout(timer);
  }, [resetUnreadCount]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-slate-600">
          Stay updated on quote requests and client activity
        </p>
      </div>

      {/* Notifications List */}
      <NotificationList
        organizationId={user?.organizationId}
        userType="provider"
      />
    </div>
  );
}
