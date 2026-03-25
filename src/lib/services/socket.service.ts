import type { Server } from 'socket.io';
import {
  SOCKET_EVENTS,
  QuotePricedPayload,
  QuoteRepricedPayload,
  QuoteStatusChangedPayload,
  QuoteNegotiationRequestedPayload,
  QuoteNegotiationRejectedPayload,
  QuoteNewPayload,
} from '../types/socket.types';

// Extend globalThis to include io property
declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

// Get the global Socket.io instance
function getIO(): Server | null {
  if (typeof globalThis !== 'undefined' && globalThis.io) {
    return globalThis.io;
  }
  return null;
}

/**
 * Emit event to a client's room
 */
export function emitToClient(clientId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`client:${clientId}`).emit(event, payload);
    console.log(`[Socket] Emitted ${event} to client:${clientId}`);
  } else {
    console.warn(`[Socket] Failed to emit ${event} to client:${clientId} - Socket.io not initialized`);
  }
}

/**
 * Emit event to a provider's room
 */
export function emitToProvider(organizationId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`provider:${organizationId}`).emit(event, payload);
    console.log(`[Socket] Emitted ${event} to provider:${organizationId}`);
  } else {
    console.warn(`[Socket] Failed to emit ${event} to provider:${organizationId} - Socket.io not initialized`);
  }
}

/**
 * Emit event to a specific quote request room
 */
export function emitToQuoteRequest(quoteRequestId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`quote-request:${quoteRequestId}`).emit(event, payload);
    console.log(`[Socket] Emitted ${event} to quote-request:${quoteRequestId}`);
  }
}

/**
 * Emit quote priced event
 */
export function emitQuotePriced(payload: QuotePricedPayload): void {
  // Notify the client
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_PRICED, payload);
  // Also emit to the quote request room for anyone watching
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_PRICED, payload);
}

/**
 * Emit quote repriced event (after negotiation)
 */
export function emitQuoteRepriced(payload: QuoteRepricedPayload): void {
  // Notify the client
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_REPRICED, payload);
  // Also emit to the quote request room
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_REPRICED, payload);
}

/**
 * Emit quote status changed event
 */
export function emitQuoteStatusChanged(payload: QuoteStatusChangedPayload): void {
  // Notify the client
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
  // Notify the provider
  emitToProvider(payload.serviceProviderId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
  // Also emit to the quote request room
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
}

/**
 * Emit quote status changed to multiple providers (when quote is approved and others are lost/missed)
 */
export function emitQuoteStatusChangedToProviders(
  providerIds: string[],
  payload: QuoteStatusChangedPayload
): void {
  providerIds.forEach((providerId) => {
    emitToProvider(providerId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, {
      ...payload,
      serviceProviderId: providerId,
    });
  });
}

/**
 * Emit negotiation requested event
 */
export function emitNegotiationRequested(payload: QuoteNegotiationRequestedPayload): void {
  // Notify the provider
  emitToProvider(payload.serviceProviderId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, payload);
  // Also emit to the quote request room
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, payload);
}

/**
 * Emit negotiation rejected event (provider rejected negotiation request)
 */
export function emitNegotiationRejected(payload: QuoteNegotiationRejectedPayload): void {
  // Notify the client
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, payload);
  // Also emit to the quote request room
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, payload);
}

/**
 * Emit new quote event to providers
 */
export function emitNewQuote(providerIds: string[], payload: QuoteNewPayload): void {
  providerIds.forEach((providerId) => {
    emitToProvider(providerId, SOCKET_EVENTS.QUOTE_NEW, payload);
  });
}
