'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NotificationType, RecipientType } from '@/src/lib/models/notification.model';
import type { ApiResponse, PaginatedResponse } from '@/src/lib/types/api.types';

// Notification response type
export interface NotificationItem {
  _id: string;
  recipientId: string;
  recipientType: RecipientType;
  type: NotificationType;
  title: string;
  message: string;
  quoteId?: string;
  quoteRequestId?: string;
  read: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  autoFetch?: boolean;
}

/**
 * Hook to fetch and manage notifications
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { page = 1, limit = 20, unreadOnly = false, autoFetch = true } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (pageNum?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', (pageNum || page).toString());
      params.append('limit', limit.toString());
      if (unreadOnly) {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data: PaginatedResponse<NotificationItem> = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, unreadOnly]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [fetchNotifications, autoFetch]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to mark notification as read: API returned', response.status);
        return false;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );

      return true;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to mark all notifications as read: API returned', response.status);
        return false;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );

      return true;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  }, []);

  // Add a new notification (used by socket subscription)
  const addNotification = useCallback((notification: NotificationItem) => {
    setNotifications((prev) => [notification, ...prev]);
    setPagination((prev) => ({
      ...prev,
      total: prev.total + 1,
    }));
  }, []);

  // Set page for pagination
  const setPage = useCallback((newPage: number) => {
    fetchNotifications(newPage);
  }, [fetchNotifications]);

  return {
    notifications,
    pagination,
    isLoading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    setPage,
  };
}

// Custom event name for notification count reset
const NOTIFICATION_COUNT_RESET_EVENT = 'notification-count-reset';

/**
 * Emit event to reset notification count across all components
 */
export function emitNotificationCountReset() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_COUNT_RESET_EVENT));
  }
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data: ApiResponse<{ count: number }> = await response.json();

      if (data.success && data.data) {
        setCount(data.data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Listen for reset events from other components
  useEffect(() => {
    const handleReset = () => {
      setCount(0);
    };

    window.addEventListener(NOTIFICATION_COUNT_RESET_EVENT, handleReset);
    return () => {
      window.removeEventListener(NOTIFICATION_COUNT_RESET_EVENT, handleReset);
    };
  }, []);

  // Increment count (used when new notification arrives)
  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  // Decrement count (used when notification is read)
  const decrement = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Reset count (used when all are marked as read)
  // Also emits event to reset count in all other components
  const reset = useCallback(() => {
    setCount(0);
    emitNotificationCountReset();
  }, []);

  return {
    count,
    isLoading,
    refresh: fetchCount,
    increment,
    decrement,
    reset,
  };
}
