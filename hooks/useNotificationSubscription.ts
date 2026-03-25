'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import {
  SOCKET_EVENTS,
  NotificationPayload,
} from '@/src/lib/types/socket.types';
import type { NotificationItem } from './useNotifications';

interface NotificationSubscriptionCallbacks {
  onNewNotification?: (notification: NotificationItem) => void;
}

interface UseNotificationSubscriptionOptions {
  // For client: auto-join client room
  clientId?: string;
  // For provider: auto-join provider room
  organizationId?: string;
  // Event callbacks
  callbacks?: NotificationSubscriptionCallbacks;
}

/**
 * Hook to subscribe to real-time notification updates
 * Listens for NOTIFICATION_NEW socket events and calls provided callbacks
 */
export function useNotificationSubscription(options: UseNotificationSubscriptionOptions = {}) {
  const {
    clientId,
    organizationId,
    callbacks,
  } = options;

  const {
    socket,
    isConnected,
    joinClientRoom,
    joinProviderRoom,
    leaveClientRoom,
    leaveProviderRoom,
  } = useSocket();

  // Join rooms based on provided IDs
  useEffect(() => {
    if (!isConnected) return;

    if (clientId) {
      joinClientRoom(clientId);
    }

    if (organizationId) {
      joinProviderRoom(organizationId);
    }

    // Cleanup: leave rooms on unmount
    return () => {
      if (clientId) {
        leaveClientRoom(clientId);
      }
      if (organizationId) {
        leaveProviderRoom(organizationId);
      }
    };
  }, [
    isConnected,
    clientId,
    organizationId,
    joinClientRoom,
    joinProviderRoom,
    leaveClientRoom,
    leaveProviderRoom,
  ]);

  // Handle new notification event
  const handleNewNotification = useCallback(
    (payload: NotificationPayload) => {
      console.log('[Socket] New notification:', payload);

      // Transform payload to NotificationItem format
      const notification: NotificationItem = {
        _id: payload._id,
        recipientId: payload.recipientId,
        recipientType: payload.recipientType,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        quoteId: payload.quoteId,
        quoteRequestId: payload.quoteRequestId,
        read: payload.read,
        metadata: payload.metadata,
        createdAt: new Date(payload.createdAt),
        updatedAt: new Date(payload.createdAt),
      };

      callbacks?.onNewNotification?.(notification);
    },
    [callbacks]
  );

  // Subscribe to notification events
  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    // Cleanup listeners
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, [socket, handleNewNotification]);

  return {
    isConnected,
  };
}
