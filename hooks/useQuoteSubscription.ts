'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import {
  SOCKET_EVENTS,
  QuotePricedPayload,
  QuoteRepricedPayload,
  QuoteStatusChangedPayload,
  QuoteNegotiationRequestedPayload,
  QuoteNegotiationRejectedPayload,
  QuoteNewPayload,
} from '@/src/lib/types/socket.types';

interface QuoteSubscriptionCallbacks {
  onQuotePriced?: (payload: QuotePricedPayload) => void;
  onQuoteRepriced?: (payload: QuoteRepricedPayload) => void;
  onQuoteStatusChanged?: (payload: QuoteStatusChangedPayload) => void;
  onNegotiationRequested?: (payload: QuoteNegotiationRequestedPayload) => void;
  onNegotiationRejected?: (payload: QuoteNegotiationRejectedPayload) => void;
  onNewQuote?: (payload: QuoteNewPayload) => void;
}

interface UseQuoteSubscriptionOptions {
  // For client: auto-join client room
  clientId?: string;
  // For provider: auto-join provider room
  organizationId?: string;
  // For specific quote request detail page
  quoteRequestId?: string;
  // Event callbacks
  callbacks?: QuoteSubscriptionCallbacks;
  // Auto-refresh function to call on any quote event
  onAnyQuoteEvent?: () => void;
}

/**
 * Hook to subscribe to real-time quote updates
 */
export function useQuoteSubscription(options: UseQuoteSubscriptionOptions = {}) {
  const {
    clientId,
    organizationId,
    quoteRequestId,
    callbacks,
    onAnyQuoteEvent,
  } = options;

  const {
    socket,
    isConnected,
    joinClientRoom,
    joinProviderRoom,
    joinQuoteRequestRoom,
    leaveClientRoom,
    leaveProviderRoom,
    leaveQuoteRequestRoom,
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

    if (quoteRequestId) {
      joinQuoteRequestRoom(quoteRequestId);
    }

    // Cleanup: leave rooms on unmount
    return () => {
      if (clientId) {
        leaveClientRoom(clientId);
      }
      if (organizationId) {
        leaveProviderRoom(organizationId);
      }
      if (quoteRequestId) {
        leaveQuoteRequestRoom(quoteRequestId);
      }
    };
  }, [
    isConnected,
    clientId,
    organizationId,
    quoteRequestId,
    joinClientRoom,
    joinProviderRoom,
    joinQuoteRequestRoom,
    leaveClientRoom,
    leaveProviderRoom,
    leaveQuoteRequestRoom,
  ]);

  // Handle quote priced event
  const handleQuotePriced = useCallback(
    (payload: QuotePricedPayload) => {
      console.log('[Socket] Quote priced:', payload);
      callbacks?.onQuotePriced?.(payload);
      onAnyQuoteEvent?.();
    },
    [callbacks, onAnyQuoteEvent]
  );

  // Handle quote repriced event
  const handleQuoteRepriced = useCallback(
    (payload: QuoteRepricedPayload) => {
      console.log('[Socket] Quote repriced:', payload);
      callbacks?.onQuoteRepriced?.(payload);
      onAnyQuoteEvent?.();
    },
    [callbacks, onAnyQuoteEvent]
  );

  // Handle quote status changed event
  const handleQuoteStatusChanged = useCallback(
    (payload: QuoteStatusChangedPayload) => {
      console.log('[Socket] Quote status changed:', payload);
      callbacks?.onQuoteStatusChanged?.(payload);
      onAnyQuoteEvent?.();
    },
    [callbacks, onAnyQuoteEvent]
  );

  // Handle negotiation requested event
  const handleNegotiationRequested = useCallback(
    (payload: QuoteNegotiationRequestedPayload) => {
      console.log('[Socket] Negotiation requested:', payload);
      callbacks?.onNegotiationRequested?.(payload);
      onAnyQuoteEvent?.();
    },
    [callbacks, onAnyQuoteEvent]
  );

  // Handle negotiation rejected event
  const handleNegotiationRejected = useCallback(
    (payload: QuoteNegotiationRejectedPayload) => {
      console.log('[Socket] Negotiation rejected:', payload);
      callbacks?.onNegotiationRejected?.(payload);
      onAnyQuoteEvent?.();
    },
    [callbacks, onAnyQuoteEvent]
  );

  // Handle new quote event
  const handleNewQuote = useCallback(
    (payload: QuoteNewPayload) => {
      console.log('[Socket] New quote:', payload);
      callbacks?.onNewQuote?.(payload);
      onAnyQuoteEvent?.();
    },
    [callbacks, onAnyQuoteEvent]
  );

  // Subscribe to events
  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.QUOTE_PRICED, handleQuotePriced);
    socket.on(SOCKET_EVENTS.QUOTE_REPRICED, handleQuoteRepriced);
    socket.on(SOCKET_EVENTS.QUOTE_STATUS_CHANGED, handleQuoteStatusChanged);
    socket.on(SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, handleNegotiationRequested);
    socket.on(SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, handleNegotiationRejected);
    socket.on(SOCKET_EVENTS.QUOTE_NEW, handleNewQuote);

    // Cleanup listeners
    return () => {
      socket.off(SOCKET_EVENTS.QUOTE_PRICED, handleQuotePriced);
      socket.off(SOCKET_EVENTS.QUOTE_REPRICED, handleQuoteRepriced);
      socket.off(SOCKET_EVENTS.QUOTE_STATUS_CHANGED, handleQuoteStatusChanged);
      socket.off(SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, handleNegotiationRequested);
      socket.off(SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, handleNegotiationRejected);
      socket.off(SOCKET_EVENTS.QUOTE_NEW, handleNewQuote);
    };
  }, [
    socket,
    handleQuotePriced,
    handleQuoteRepriced,
    handleQuoteStatusChanged,
    handleNegotiationRequested,
    handleNegotiationRejected,
    handleNewQuote,
  ]);

  return {
    isConnected,
  };
}
