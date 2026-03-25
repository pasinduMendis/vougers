import type { QuoteStatus } from './quote.types';

import type { NotificationType, RecipientType } from '../models/notification.model';

// Socket event names
export const SOCKET_EVENTS = {
  // Quote events
  QUOTE_PRICED: 'quote:priced',
  QUOTE_REPRICED: 'quote:repriced',
  QUOTE_STATUS_CHANGED: 'quote:status_changed',
  QUOTE_NEGOTIATION_REQUESTED: 'quote:negotiation_requested',
  QUOTE_NEGOTIATION_REJECTED: 'quote:negotiation_rejected',
  QUOTE_NEW: 'quote:new',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',

  // Room events
  JOIN_CLIENT: 'join:client',
  JOIN_PROVIDER: 'join:provider',
  JOIN_QUOTE_REQUEST: 'join:quote-request',
  LEAVE_CLIENT: 'leave:client',
  LEAVE_PROVIDER: 'leave:provider',
  LEAVE_QUOTE_REQUEST: 'leave:quote-request',
} as const;

// Event payload types
export interface QuotePricedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  providerName: string;
  freightCost: number;
  transitDays: number;
  pricedAt: Date;
}

export interface QuoteRepricedPayload extends QuotePricedPayload {
  previousFreightCost: number;
  previousTransitDays: number;
}

export interface QuoteStatusChangedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  oldStatus: QuoteStatus;
  newStatus: QuoteStatus;
  // For approved status - includes counts of affected quotes
  autoLostCount?: number;
  autoMissedCount?: number;
}

export interface QuoteNegotiationRequestedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  clientName: string;
  serviceProviderId: string;
  message?: string;
  requestedAt: Date;
}

export interface QuoteNegotiationRejectedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  providerName: string;
  freightCost: number;
  transitDays: number;
  rejectedAt: Date;
}

export interface QuoteNewPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  clientName: string;
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  createdAt: Date;
}

export interface NotificationPayload {
  _id: string;
  recipientId: string;
  recipientType: RecipientType;
  type: NotificationType;
  title: string;
  message: string;
  quoteId?: string;
  quoteRequestId?: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Room types
export type ClientRoom = `client:${string}`;
export type ProviderRoom = `provider:${string}`;
export type QuoteRequestRoom = `quote-request:${string}`;
export type SocketRoom = ClientRoom | ProviderRoom | QuoteRequestRoom;

// Socket event map for type safety
export interface ServerToClientEvents {
  [SOCKET_EVENTS.QUOTE_PRICED]: (payload: QuotePricedPayload) => void;
  [SOCKET_EVENTS.QUOTE_REPRICED]: (payload: QuoteRepricedPayload) => void;
  [SOCKET_EVENTS.QUOTE_STATUS_CHANGED]: (payload: QuoteStatusChangedPayload) => void;
  [SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED]: (payload: QuoteNegotiationRequestedPayload) => void;
  [SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED]: (payload: QuoteNegotiationRejectedPayload) => void;
  [SOCKET_EVENTS.QUOTE_NEW]: (payload: QuoteNewPayload) => void;
  [SOCKET_EVENTS.NOTIFICATION_NEW]: (payload: NotificationPayload) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.JOIN_CLIENT]: (clientId: string) => void;
  [SOCKET_EVENTS.JOIN_PROVIDER]: (organizationId: string) => void;
  [SOCKET_EVENTS.JOIN_QUOTE_REQUEST]: (quoteRequestId: string) => void;
  [SOCKET_EVENTS.LEAVE_CLIENT]: (clientId: string) => void;
  [SOCKET_EVENTS.LEAVE_PROVIDER]: (organizationId: string) => void;
  [SOCKET_EVENTS.LEAVE_QUOTE_REQUEST]: (quoteRequestId: string) => void;
}
