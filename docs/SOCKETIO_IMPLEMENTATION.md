# Socket.io Implementation Documentation

## Overview

The Voyagers freight quote management system uses Socket.io for real-time bidirectional communication between server and clients. The implementation provides instant updates for quote changes, negotiations, and notifications without requiring page refreshes.

### Architecture

```
server.js                              # Custom HTTP server with Socket.io
src/lib/services/socket.service.ts     # Server-side emit utilities
src/lib/types/socket.types.ts          # Event types and payloads
contexts/SocketContext.tsx             # React Socket.io client provider
hooks/useQuoteSubscription.ts          # Quote events subscription hook
hooks/useNotificationSubscription.ts   # Notification events subscription hook
```

---

## Dependencies

**File:** `package.json`

```json
{
  "dependencies": {
    "socket.io": "^4.8.3",
    "socket.io-client": "^4.8.3"
  }
}
```

---

## Server Configuration

**File:** `server.js`

### Custom HTTP Server

The application uses a custom Node.js HTTP server wrapping Next.js to support Socket.io.

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socketio',
  });

  // Make io accessible globally for services
  global.io = io;

  // Connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Room joining
    socket.on('join:client', (clientId) => {
      socket.join(`client:${clientId}`);
    });

    socket.on('join:provider', (organizationId) => {
      socket.join(`provider:${organizationId}`);
    });

    socket.on('join:quote-request', (quoteRequestId) => {
      socket.join(`quote-request:${quoteRequestId}`);
    });

    // Room leaving
    socket.on('leave:client', (clientId) => {
      socket.leave(`client:${clientId}`);
    });

    socket.on('leave:provider', (organizationId) => {
      socket.leave(`provider:${organizationId}`);
    });

    socket.on('leave:quote-request', (quoteRequestId) => {
      socket.leave(`quote-request:${quoteRequestId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
```

---

## Room Management Strategy

### Three Room Types

| Room Type | Format | Purpose |
|-----------|--------|---------|
| Client | `client:{clientId}` | User-specific notifications and quote updates |
| Provider | `provider:{organizationId}` | Organization-wide updates for all provider users |
| Quote Request | `quote-request:{quoteRequestId}` | Granular updates for detail page views |

### Room Usage

```
Client Room (client:abc123)
├── Quote status changes for client's quotes
├── Price updates on client's quote requests
└── Notifications targeted at this client

Provider Room (provider:xyz789)
├── New quote requests available
├── Negotiation requests from clients
├── Quote status changes (approved/rejected)
└── Notifications targeted at this organization

Quote Request Room (quote-request:qr123)
├── All events for this specific quote request
├── Used on detail pages for granular updates
└── Both clients and providers can join
```

---

## Socket Types

**File:** `src/lib/types/socket.types.ts`

### Event Names

```typescript
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

  // Room events (client-to-server)
  JOIN_CLIENT: 'join:client',
  JOIN_PROVIDER: 'join:provider',
  JOIN_QUOTE_REQUEST: 'join:quote-request',
  LEAVE_CLIENT: 'leave:client',
  LEAVE_PROVIDER: 'leave:provider',
  LEAVE_QUOTE_REQUEST: 'leave:quote-request',
} as const;
```

### Event Payloads

#### QuotePricedPayload

```typescript
interface QuotePricedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  providerName: string;
  freightCost: number;
  transitDays: number;
  pricedAt: Date;
}
```

#### QuoteRepricedPayload

```typescript
interface QuoteRepricedPayload extends QuotePricedPayload {
  previousFreightCost: number;
  previousTransitDays: number;
}
```

#### QuoteStatusChangedPayload

```typescript
interface QuoteStatusChangedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  oldStatus: QuoteStatus;
  newStatus: QuoteStatus;
  autoLostCount?: number;
  autoMissedCount?: number;
}
```

#### QuoteNegotiationRequestedPayload

```typescript
interface QuoteNegotiationRequestedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  clientName: string;
  serviceProviderId: string;
  message?: string;
  requestedAt: Date;
}
```

#### QuoteNegotiationRejectedPayload

```typescript
interface QuoteNegotiationRejectedPayload {
  quoteId: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  providerName: string;
  freightCost: number;
  transitDays: number;
  rejectedAt: Date;
}
```

#### QuoteNewPayload

```typescript
interface QuoteNewPayload {
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
```

#### NotificationPayload

```typescript
interface NotificationPayload {
  _id: string;
  recipientId: string;
  recipientType: 'client' | 'provider';
  type: NotificationType;
  title: string;
  message: string;
  quoteId?: string;
  quoteRequestId?: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

### Type-Safe Event Maps

```typescript
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
```

---

## Socket Service (Server-Side)

**File:** `src/lib/services/socket.service.ts`

### Core Functions

```typescript
// Get global Socket.io instance
function getIO(): Server | null {
  return (global as any).io || null;
}

// Emit to specific client room
export function emitToClient(
  clientId: string,
  event: string,
  payload: unknown
): void {
  const io = getIO();
  if (io) {
    io.to(`client:${clientId}`).emit(event, payload);
  }
}

// Emit to provider organization room
export function emitToProvider(
  organizationId: string,
  event: string,
  payload: unknown
): void {
  const io = getIO();
  if (io) {
    io.to(`provider:${organizationId}`).emit(event, payload);
  }
}

// Emit to quote request room
export function emitToQuoteRequest(
  quoteRequestId: string,
  event: string,
  payload: unknown
): void {
  const io = getIO();
  if (io) {
    io.to(`quote-request:${quoteRequestId}`).emit(event, payload);
  }
}
```

### High-Level Event Emitters

```typescript
// Quote priced - emit to client and quote request rooms
export function emitQuotePriced(payload: QuotePricedPayload): void {
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_PRICED, payload);
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_PRICED, payload);
}

// Quote repriced - emit to client and quote request rooms
export function emitQuoteRepriced(payload: QuoteRepricedPayload): void {
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_REPRICED, payload);
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_REPRICED, payload);
}

// Quote status changed - emit to all relevant rooms
export function emitQuoteStatusChanged(payload: QuoteStatusChangedPayload): void {
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
  emitToProvider(payload.serviceProviderId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
}

// Broadcast status change to multiple providers (e.g., when quote approved, others lost)
export function emitQuoteStatusChangedToProviders(
  providerIds: string[],
  payload: QuoteStatusChangedPayload
): void {
  providerIds.forEach((providerId) => {
    emitToProvider(providerId, SOCKET_EVENTS.QUOTE_STATUS_CHANGED, payload);
  });
}

// Negotiation requested - emit to provider
export function emitNegotiationRequested(payload: QuoteNegotiationRequestedPayload): void {
  emitToProvider(payload.serviceProviderId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, payload);
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, payload);
}

// Negotiation rejected - emit to client
export function emitNegotiationRejected(payload: QuoteNegotiationRejectedPayload): void {
  emitToClient(payload.clientId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, payload);
  emitToQuoteRequest(payload.quoteRequestId, SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, payload);
}

// New quote - broadcast to multiple providers
export function emitNewQuote(providerIds: string[], payload: QuoteNewPayload): void {
  providerIds.forEach((providerId) => {
    emitToProvider(providerId, SOCKET_EVENTS.QUOTE_NEW, payload);
  });
}
```

---

## React Socket Context

**File:** `contexts/SocketContext.tsx`

### Socket Provider

```typescript
'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, ServerToClientEvents, ClientToServerEvents } from '@/src/lib/types/socket.types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
  isConnected: boolean;
  joinClientRoom: (clientId: string) => void;
  joinProviderRoom: (organizationId: string) => void;
  joinQuoteRequestRoom: (quoteRequestId: string) => void;
  leaveClientRoom: (clientId: string) => void;
  leaveProviderRoom: (organizationId: string) => void;
  leaveQuoteRequestRoom: (quoteRequestId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance: TypedSocket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinClientRoom = useCallback((clientId: string) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.JOIN_CLIENT, clientId);
    }
  }, [socket, isConnected]);

  const joinProviderRoom = useCallback((organizationId: string) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.JOIN_PROVIDER, organizationId);
    }
  }, [socket, isConnected]);

  const joinQuoteRequestRoom = useCallback((quoteRequestId: string) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.JOIN_QUOTE_REQUEST, quoteRequestId);
    }
  }, [socket, isConnected]);

  const leaveClientRoom = useCallback((clientId: string) => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.LEAVE_CLIENT, clientId);
    }
  }, [socket]);

  const leaveProviderRoom = useCallback((organizationId: string) => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.LEAVE_PROVIDER, organizationId);
    }
  }, [socket]);

  const leaveQuoteRequestRoom = useCallback((quoteRequestId: string) => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.LEAVE_QUOTE_REQUEST, quoteRequestId);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinClientRoom,
      joinProviderRoom,
      joinQuoteRequestRoom,
      leaveClientRoom,
      leaveProviderRoom,
      leaveQuoteRequestRoom,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
```

---

## React Hooks

### useQuoteSubscription

**File:** `hooks/useQuoteSubscription.ts`

```typescript
'use client';

import { useEffect } from 'react';
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

interface UseQuoteSubscriptionOptions {
  clientId?: string;
  organizationId?: string;
  quoteRequestId?: string;
  callbacks?: {
    onQuotePriced?: (payload: QuotePricedPayload) => void;
    onQuoteRepriced?: (payload: QuoteRepricedPayload) => void;
    onQuoteStatusChanged?: (payload: QuoteStatusChangedPayload) => void;
    onNegotiationRequested?: (payload: QuoteNegotiationRequestedPayload) => void;
    onNegotiationRejected?: (payload: QuoteNegotiationRejectedPayload) => void;
    onNewQuote?: (payload: QuoteNewPayload) => void;
  };
  onAnyQuoteEvent?: () => void;
}

export function useQuoteSubscription(options: UseQuoteSubscriptionOptions) {
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

  const {
    clientId,
    organizationId,
    quoteRequestId,
    callbacks,
    onAnyQuoteEvent,
  } = options;

  // Join rooms on mount
  useEffect(() => {
    if (!isConnected) return;

    if (clientId) joinClientRoom(clientId);
    if (organizationId) joinProviderRoom(organizationId);
    if (quoteRequestId) joinQuoteRequestRoom(quoteRequestId);

    return () => {
      if (clientId) leaveClientRoom(clientId);
      if (organizationId) leaveProviderRoom(organizationId);
      if (quoteRequestId) leaveQuoteRequestRoom(quoteRequestId);
    };
  }, [isConnected, clientId, organizationId, quoteRequestId]);

  // Subscribe to events
  useEffect(() => {
    if (!socket) return;

    const handleQuotePriced = (payload: QuotePricedPayload) => {
      callbacks?.onQuotePriced?.(payload);
      onAnyQuoteEvent?.();
    };

    const handleQuoteRepriced = (payload: QuoteRepricedPayload) => {
      callbacks?.onQuoteRepriced?.(payload);
      onAnyQuoteEvent?.();
    };

    const handleStatusChanged = (payload: QuoteStatusChangedPayload) => {
      callbacks?.onQuoteStatusChanged?.(payload);
      onAnyQuoteEvent?.();
    };

    const handleNegotiationRequested = (payload: QuoteNegotiationRequestedPayload) => {
      callbacks?.onNegotiationRequested?.(payload);
      onAnyQuoteEvent?.();
    };

    const handleNegotiationRejected = (payload: QuoteNegotiationRejectedPayload) => {
      callbacks?.onNegotiationRejected?.(payload);
      onAnyQuoteEvent?.();
    };

    const handleNewQuote = (payload: QuoteNewPayload) => {
      callbacks?.onNewQuote?.(payload);
      onAnyQuoteEvent?.();
    };

    socket.on(SOCKET_EVENTS.QUOTE_PRICED, handleQuotePriced);
    socket.on(SOCKET_EVENTS.QUOTE_REPRICED, handleQuoteRepriced);
    socket.on(SOCKET_EVENTS.QUOTE_STATUS_CHANGED, handleStatusChanged);
    socket.on(SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, handleNegotiationRequested);
    socket.on(SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, handleNegotiationRejected);
    socket.on(SOCKET_EVENTS.QUOTE_NEW, handleNewQuote);

    return () => {
      socket.off(SOCKET_EVENTS.QUOTE_PRICED, handleQuotePriced);
      socket.off(SOCKET_EVENTS.QUOTE_REPRICED, handleQuoteRepriced);
      socket.off(SOCKET_EVENTS.QUOTE_STATUS_CHANGED, handleStatusChanged);
      socket.off(SOCKET_EVENTS.QUOTE_NEGOTIATION_REQUESTED, handleNegotiationRequested);
      socket.off(SOCKET_EVENTS.QUOTE_NEGOTIATION_REJECTED, handleNegotiationRejected);
      socket.off(SOCKET_EVENTS.QUOTE_NEW, handleNewQuote);
    };
  }, [socket, callbacks, onAnyQuoteEvent]);

  return { isConnected };
}
```

### useNotificationSubscription

**File:** `hooks/useNotificationSubscription.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { SOCKET_EVENTS, NotificationPayload } from '@/src/lib/types/socket.types';

interface UseNotificationSubscriptionOptions {
  clientId?: string;
  organizationId?: string;
  callbacks?: {
    onNewNotification?: (notification: NotificationPayload) => void;
  };
}

export function useNotificationSubscription(options: UseNotificationSubscriptionOptions) {
  const {
    socket,
    isConnected,
    joinClientRoom,
    joinProviderRoom,
    leaveClientRoom,
    leaveProviderRoom,
  } = useSocket();

  const { clientId, organizationId, callbacks } = options;

  // Join rooms
  useEffect(() => {
    if (!isConnected) return;

    if (clientId) joinClientRoom(clientId);
    if (organizationId) joinProviderRoom(organizationId);

    return () => {
      if (clientId) leaveClientRoom(clientId);
      if (organizationId) leaveProviderRoom(organizationId);
    };
  }, [isConnected, clientId, organizationId]);

  // Subscribe to notification events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (payload: NotificationPayload) => {
      callbacks?.onNewNotification?.(payload);
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, [socket, callbacks]);

  return { isConnected };
}
```

---

## Layout Integration

### Client Dashboard Layout

**File:** `app/(dashboard)/client/layout.tsx`

```typescript
'use client';

import { SocketProvider } from '@/contexts/SocketContext';
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';
import { useUnreadCount } from '@/hooks/useNotifications';

export default function ClientDashboardLayout({ children }) {
  return (
    <SocketProvider>
      <ClientDashboardInner>
        {children}
      </ClientDashboardInner>
    </SocketProvider>
  );
}

function ClientDashboardInner({ children }) {
  const { user } = useAuth();
  const { increment: incrementUnread } = useUnreadCount();

  // Subscribe to notifications
  useNotificationSubscription({
    clientId: user?.id,
    callbacks: {
      onNewNotification: () => {
        incrementUnread();
      },
    },
  });

  return (
    <div className="flex">
      <Sidebar notificationCount={unreadCount} />
      <main>{children}</main>
    </div>
  );
}
```

### Provider Dashboard Layout

**File:** `app/(dashboard)/provider/layout.tsx`

```typescript
'use client';

import { SocketProvider } from '@/contexts/SocketContext';
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';

export default function ProviderDashboardLayout({ children }) {
  return (
    <SocketProvider>
      <ProviderDashboardInner>
        {children}
      </ProviderDashboardInner>
    </SocketProvider>
  );
}

function ProviderDashboardInner({ children }) {
  const { user } = useAuth();
  const { increment: incrementUnread } = useUnreadCount();

  useNotificationSubscription({
    organizationId: user?.organizationId,
    callbacks: {
      onNewNotification: () => {
        incrementUnread();
      },
    },
  });

  return (/* layout JSX */);
}
```

---

## Service Integration Examples

### Quote Service - Price Quote

**File:** `src/lib/services/quote.service.ts`

```typescript
import { emitQuotePriced, emitQuoteRepriced } from './socket.service';
import { notifyQuotePriced, notifyQuoteRepriced } from './notification.service';

export async function priceQuote(quoteId: string, data: PriceData) {
  const quote = await QuoteModel.findById(quoteId);
  const isReprice = quote.status === 'priced' && quote.negotiationRequested;

  const previousCost = quote.freightCost;
  const previousDays = quote.transitDays;

  // Update quote
  quote.freightCost = data.freightCost;
  quote.transitDays = data.transitDays;
  quote.status = 'priced';
  quote.pricedAt = new Date();
  quote.negotiationRequested = false;
  await quote.save();

  // Build payload
  const payload = {
    quoteId: quote._id.toString(),
    quoteRequestId: quote.quoteRequestId.toString(),
    clientId: quote.clientId.toString(),
    serviceProviderId: quote.serviceProviderId.toString(),
    providerName: provider.name,
    freightCost: quote.freightCost,
    transitDays: quote.transitDays,
    pricedAt: quote.pricedAt,
  };

  // Emit socket event
  if (isReprice) {
    emitQuoteRepriced({
      ...payload,
      previousFreightCost: previousCost,
      previousTransitDays: previousDays,
    });
    await notifyQuoteRepriced({ ... });
  } else {
    emitQuotePriced(payload);
    await notifyQuotePriced({ ... });
  }

  return quote;
}
```

### Quote Request Service - Create Quote Request

**File:** `src/lib/services/quote-request.service.ts`

```typescript
import { emitNewQuote } from './socket.service';
import { notifyNewQuoteRequest } from './notification.service';

export async function createQuoteRequest(data: QuoteRequestData) {
  // Create quote request
  const quoteRequest = await QuoteRequestModel.create(data);

  // Create quotes for each target provider
  const quotes = await QuoteModel.insertMany(
    data.targetProviderIds.map(providerId => ({
      quoteRequestId: quoteRequest._id,
      clientId: data.clientId,
      serviceProviderId: providerId,
      status: 'pending',
    }))
  );

  // Build payload
  const payload = {
    quoteId: quotes[0]._id.toString(),
    quoteRequestId: quoteRequest._id.toString(),
    clientId: data.clientId.toString(),
    clientName: client.name,
    portOfLoading: quoteRequest.portOfLoading,
    portOfDischarge: quoteRequest.portOfDischarge,
    commodity: quoteRequest.commodity,
    volume: quoteRequest.volume,
    createdAt: quoteRequest.createdAt,
  };

  // Emit to all target providers
  emitNewQuote(
    data.targetProviderIds.map(id => id.toString()),
    payload
  );

  // Create notifications
  for (const providerId of data.targetProviderIds) {
    await notifyNewQuoteRequest({ providerId, ... });
  }

  return quoteRequest;
}
```

---

## Real-Time Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. User Action                               │
│                     (Provider clicks "Price Quote")              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     2. API Request                               │
│                     POST /api/quotes/[id]/price                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     3. Service Layer                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  quote.service.ts                                        │    │
│  │  - Update database                                       │    │
│  │  - Call emitQuotePriced()                                │    │
│  │  - Call notifyQuotePriced()                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│  4. Socket Emission       │   │  5. Notification Creation     │
│  ─────────────────────    │   │  ─────────────────────────    │
│  Emit to:                 │   │  - Save to database           │
│  - client:{clientId}      │   │  - Emit NOTIFICATION_NEW      │
│  - quote-request:{id}     │   │    via socket                 │
└───────────┬───────────────┘   └───────────────┬───────────────┘
            │                                   │
            └───────────────┬───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                6. Client Browsers Receive Events                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  useQuoteSubscription                                    │    │
│  │  - Receives QUOTE_PRICED event                           │    │
│  │  - Calls onAnyQuoteEvent() → refresh()                   │    │
│  │  - UI re-renders with new data                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  useNotificationSubscription                             │    │
│  │  - Receives NOTIFICATION_NEW event                       │    │
│  │  - Increments unread badge count                         │    │
│  │  - Shows notification toast (if implemented)             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Page Usage Examples

### Provider Quotes Page

```typescript
export default function ProviderQuotesPage() {
  const { user } = useAuth();
  const { quotes, refresh } = useQuotes();

  // Real-time updates
  const { isConnected } = useQuoteSubscription({
    organizationId: user?.organizationId,
    onAnyQuoteEvent: refresh,
    callbacks: {
      onNegotiationRequested: (payload) => {
        toast.info(`Negotiation requested for quote ${payload.quoteId}`);
      },
    },
  });

  return (
    <div>
      <StatusIndicator connected={isConnected} />
      <QuoteList quotes={quotes} />
    </div>
  );
}
```

### Client Quote Detail Page

```typescript
export default function QuoteDetailPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { quoteRequest, refresh } = useQuoteRequest(id);

  // Subscribe to specific quote request room
  const { isConnected } = useQuoteSubscription({
    clientId: user?.id,
    quoteRequestId: id,
    onAnyQuoteEvent: refresh,
  });

  return (
    <div>
      <QuoteComparison quotes={quoteRequest?.quotes} />
    </div>
  );
}
```

---

## Files Added/Modified

### New Files

| File | Purpose |
|------|---------|
| `server.js` | Custom HTTP server with Socket.io |
| `src/lib/services/socket.service.ts` | Server-side emit utilities |
| `src/lib/types/socket.types.ts` | Event types and payloads |
| `contexts/SocketContext.tsx` | React Socket.io provider |
| `hooks/useQuoteSubscription.ts` | Quote events hook |
| `hooks/useNotificationSubscription.ts` | Notification events hook |

### Modified Files

| File | Changes |
|------|---------|
| `package.json` | Added socket.io dependencies |
| `app/(dashboard)/client/layout.tsx` | Added SocketProvider and subscription |
| `app/(dashboard)/provider/layout.tsx` | Added SocketProvider and subscription |
| `src/lib/services/quote.service.ts` | Added socket emissions |
| `src/lib/services/quote-request.service.ts` | Added socket emissions |
| `src/lib/services/notification.service.ts` | Added socket emissions |

---

## Configuration

### Environment Variables

```env
# Socket.io uses same port as Next.js
PORT=3000

# For production CORS
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Development

```bash
# Uses server.js with Socket.io
npm run dev
```

### Production

```bash
npm run build
npm run start  # Uses server.js
```

---

## Error Handling

### Server-Side

```typescript
function getIO(): Server | null {
  if (typeof global !== 'undefined' && global.io) {
    return global.io;
  }
  return null;
}

export function emitToClient(clientId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`client:${clientId}`).emit(event, payload);
  }
  // Silently fails if io not available (e.g., during SSR)
}
```

### Client-Side

```typescript
const joinClientRoom = useCallback((clientId: string) => {
  if (socket && isConnected) {
    socket.emit(SOCKET_EVENTS.JOIN_CLIENT, clientId);
  }
}, [socket, isConnected]);
```

### Reconnection

```typescript
const socketInstance = io({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'], // Fallback
});
```

---

## Security Considerations

### Current Implementation

- CORS configured for specific origins
- Room IDs as implicit authorization
- Credentials included in connection

### Recommended Improvements

1. **Socket Authentication Middleware**
   ```javascript
   io.use(async (socket, next) => {
     const token = socket.handshake.auth.token;
     try {
       const payload = verifyToken(token);
       socket.data.user = payload;
       next();
     } catch (err) {
       next(new Error('Authentication failed'));
     }
   });
   ```

2. **Server-Side Room Validation**
   ```javascript
   socket.on('join:client', async (clientId) => {
     if (socket.data.user?.clientId === clientId) {
       socket.join(`client:${clientId}`);
     }
   });
   ```

---

## Scaling Considerations

For horizontal scaling with multiple server instances:

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```
