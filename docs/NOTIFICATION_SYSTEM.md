# Notification System Documentation

## Overview

The Voyagers notification system provides real-time notifications for quote-related events between clients and providers. Built with MongoDB/Mongoose for persistence and Socket.io for real-time delivery.

### Architecture

```
src/lib/models/notification.model.ts    # Mongoose schema
src/lib/services/notification.service.ts # Business logic
src/lib/types/socket.types.ts            # Socket event types

app/api/notifications/                   # API endpoints
├── route.ts                             # GET - list notifications
├── [id]/read/route.ts                   # PATCH - mark as read
├── mark-all-read/route.ts               # PATCH - mark all as read
└── unread-count/route.ts                # GET - unread count

hooks/
├── useNotifications.ts                  # Notification data hook
└── useNotificationSubscription.ts       # Real-time subscription hook

components/notifications/
├── NotificationItem.tsx                 # Single notification display
├── NotificationBell.tsx                 # Header bell with dropdown
└── NotificationList.tsx                 # Full page list

app/(dashboard)/client/notifications/    # Client notifications page
app/(dashboard)/provider/notifications/  # Provider notifications page

contexts/SocketContext.tsx               # Socket.io client context
src/lib/services/socket.service.ts       # Socket emit utilities
```

---

## Notification Model

**File:** `src/lib/models/notification.model.ts`

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `recipientId` | ObjectId | Client ID or Organization ID |
| `recipientType` | Enum | `'client'` or `'provider'` |
| `type` | NotificationType | One of 10 notification types |
| `title` | String | Notification title (max 200 chars) |
| `message` | String | Detailed message (max 500 chars) |
| `quoteId` | ObjectId? | Reference to related Quote |
| `quoteRequestId` | ObjectId? | Reference to related QuoteRequest |
| `read` | Boolean | Read status (default: false) |
| `readAt` | Date? | When marked as read |
| `metadata` | Mixed? | Additional data object |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### Notification Types

| Type | Recipient | Description |
|------|-----------|-------------|
| `quote_priced` | Client | Provider priced a quote |
| `quote_repriced` | Client | Provider revised price after negotiation |
| `quote_approved` | Provider | Client approved the quote |
| `quote_rejected` | Provider | Client rejected the quote |
| `quote_completed` | Client | Shipment completed |
| `quote_lost` | Provider | Another provider was selected |
| `quote_missed` | Provider | Provider missed pricing opportunity |
| `negotiation_requested` | Provider | Client requests price negotiation |
| `negotiation_rejected` | Client | Provider declined negotiation |
| `new_quote_request` | Provider | New quote request available |

### Indexes

```typescript
// Compound indexes for efficient queries
{ recipientId: 1, recipientType: 1, createdAt: -1 }
{ recipientId: 1, recipientType: 1, read: 1 }

// Individual indexes
{ quoteId: 1 }
{ quoteRequestId: 1 }
{ type: 1 }
```

### Static Methods

```typescript
// Paginated fetch with optional unread filter
Notification.getByRecipient(recipientId, recipientType, options)

// Count unread notifications
Notification.countUnread(recipientId, recipientType)

// Bulk mark as read
Notification.markAllRead(recipientId, recipientType)
```

---

## Notification Service

**File:** `src/lib/services/notification.service.ts`

### Core Functions

#### `createNotification(params)`

Creates a notification and emits via socket.

```typescript
interface CreateNotificationParams {
  recipientId: string;
  recipientType: 'client' | 'provider';
  type: NotificationType;
  quoteId?: string;
  quoteRequestId?: string;
  metadata?: Record<string, unknown>;
  // Template data for message generation
  providerName?: string;
  clientName?: string;
  route?: string;
  price?: number;
}
```

#### `getNotifications(recipientId, recipientType, options)`

```typescript
interface Options {
  page?: number;      // default: 1
  limit?: number;     // default: 20
  unreadOnly?: boolean;
}

// Returns
{
  notifications: NotificationItem[];
  pagination: { page, limit, total, totalPages };
}
```

#### `getUnreadCount(recipientId, recipientType)`

Returns the count of unread notifications.

#### `markAsRead(notificationId, recipientId, recipientType)`

Marks a single notification as read. Verifies ownership.

#### `markAllAsRead(recipientId, recipientType)`

Bulk marks all unread notifications as read. Returns modified count.

#### `deleteNotification(notificationId, recipientId, recipientType)`

Deletes a notification. Verifies ownership.

### Helper Functions

Specialized notification creators for common events:

| Function | Recipient | Trigger |
|----------|-----------|---------|
| `notifyQuotePriced()` | Client | Provider prices quote |
| `notifyQuoteRepriced()` | Client | Provider revises price |
| `notifyQuoteApproved()` | Provider | Client approves quote |
| `notifyQuoteRejected()` | Provider | Client rejects quote |
| `notifyQuoteCompleted()` | Client | Shipment complete |
| `notifyQuoteLost()` | Provider | Lost to competitor |
| `notifyQuoteMissed()` | Provider | Missed pricing window |
| `notifyNegotiationRequested()` | Provider | Client wants negotiation |
| `notifyNegotiationRejected()` | Client | Negotiation declined |
| `notifyNewQuoteRequest()` | Provider | New quote request |

### Message Templates

Each notification type has a predefined template:

```typescript
const TEMPLATES = {
  quote_priced: {
    title: 'Quote Priced',
    message: (data) => `${data.providerName} has priced your quote for ${data.route} at $${data.price}`,
  },
  // ... other types
};
```

---

## API Endpoints

### GET `/api/notifications`

Fetch paginated notifications for authenticated user.

**Auth:** Client or Provider

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `unreadOnly` | boolean | false | Only unread |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "type": "quote_priced",
      "title": "Quote Priced",
      "message": "Provider X has priced...",
      "read": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### PATCH `/api/notifications/[id]/read`

Mark a single notification as read.

**Auth:** Client or Provider

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "read": true,
    "readAt": "2024-01-15T10:35:00Z"
  }
}
```

### PATCH `/api/notifications/mark-all-read`

Mark all unread notifications as read.

**Auth:** Client or Provider

**Response:**
```json
{
  "success": true,
  "data": {
    "modifiedCount": 12
  }
}
```

### GET `/api/notifications/unread-count`

Get count of unread notifications.

**Auth:** Client or Provider

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## React Hooks

### `useNotifications`

**File:** `hooks/useNotifications.ts`

Main hook for notification data management.

```typescript
interface UseNotificationsOptions {
  page?: number;        // default: 1
  limit?: number;       // default: 20
  unreadOnly?: boolean; // default: false
  autoFetch?: boolean;  // default: true
}

const {
  notifications,     // NotificationItem[]
  pagination,        // { page, limit, total, totalPages }
  isLoading,         // boolean
  error,             // string | null
  refresh,           // () => void
  markAsRead,        // (id: string) => Promise<void>
  markAllAsRead,     // () => Promise<void>
  addNotification,   // (notification) => void (for real-time)
  setPage,           // (page: number) => void
} = useNotifications(options);
```

### `useUnreadCount`

**File:** `hooks/useNotifications.ts`

Hook for unread badge count.

```typescript
const {
  count,      // number
  isLoading,  // boolean
  refresh,    // () => void
  increment,  // () => void
  decrement,  // () => void
  reset,      // () => void
} = useUnreadCount();
```

### `useNotificationSubscription`

**File:** `hooks/useNotificationSubscription.ts`

Hook for real-time socket subscription.

```typescript
interface UseNotificationSubscriptionOptions {
  clientId?: string;
  organizationId?: string;
  callbacks?: {
    onNewNotification?: (notification: NotificationItem) => void;
  };
}

const { isConnected } = useNotificationSubscription({
  clientId: user?.clientId,
  organizationId: user?.organizationId,
  callbacks: {
    onNewNotification: (notification) => {
      // Handle new notification
      addNotification(notification);
      incrementCount();
    },
  },
});
```

---

## UI Components

### `NotificationItem`

**File:** `components/notifications/NotificationItem.tsx`

Displays a single notification with icon, time, and read status.

**Props:**
```typescript
interface NotificationItemProps {
  notification: NotificationItem;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
  compact?: boolean;  // Hides message in compact mode
}
```

**Features:**
- Type-specific icons (10 unique SVG icons)
- Color coding per type (green, blue, red, amber, purple, indigo, slate)
- Relative time formatting ("Just now", "5m ago", "2h ago", "3d ago")
- Unread indicator (blue dot)
- Auto marks as read on click

### `NotificationBell`

**File:** `components/notifications/NotificationBell.tsx`

Header bell icon with dropdown for quick access.

**Props:**
```typescript
interface NotificationBellProps {
  clientId?: string;
  organizationId?: string;
  userType: 'client' | 'provider';
  className?: string;
}
```

**Features:**
- Badge showing unread count
- Dropdown with latest 5 notifications
- "Mark all as read" action
- Real-time updates via socket
- Click outside to close
- Navigate on notification click
- "View all notifications" link
- Empty state handling

### `NotificationList`

**File:** `components/notifications/NotificationList.tsx`

Full-page notification list with pagination.

**Props:**
```typescript
interface NotificationListProps {
  clientId?: string;
  organizationId?: string;
  userType: 'client' | 'provider';
  className?: string;
}
```

**Features:**
- Unread count in header
- "Mark all as read" button
- Real-time updates
- Pagination controls
- Loading state
- Error state with retry
- Empty state

---

## Dashboard Pages

### Client Notifications

**File:** `app/(dashboard)/client/notifications/page.tsx`

```typescript
export default function ClientNotificationsPage() {
  const { user } = useAuth();
  const { reset: resetUnreadCount } = useUnreadCount();
  const hasMarkedAsRead = useRef(false);

  // Mark all notifications as read when visiting this page
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

    const timer = setTimeout(markAllAsRead, 500);
    return () => clearTimeout(timer);
  }, [resetUnreadCount]);

  return (
    <div>
      <h1>Notifications</h1>
      <p>Stay updated on your quote requests and shipments</p>
      <NotificationList
        clientId={user?.clientId}
        userType="client"
      />
    </div>
  );
}
```

### Provider Notifications

**File:** `app/(dashboard)/provider/notifications/page.tsx`

```typescript
export default function ProviderNotificationsPage() {
  const { user } = useAuth();
  const { reset: resetUnreadCount } = useUnreadCount();
  const hasMarkedAsRead = useRef(false);

  // Mark all notifications as read when visiting this page
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

    const timer = setTimeout(markAllAsRead, 500);
    return () => clearTimeout(timer);
  }, [resetUnreadCount]);

  return (
    <div>
      <h1>Notifications</h1>
      <p>Stay updated on quote requests and client activity</p>
      <NotificationList
        organizationId={user?.organizationId}
        userType="provider"
      />
    </div>
  );
}
```

### Auto Mark-as-Read Behavior

When a user visits the notifications page:

1. **API Call**: After a 500ms delay, the page calls `PATCH /api/notifications/mark-all-read`
2. **Database Update**: All unread notifications are marked as `read: true` with `readAt` timestamp
3. **UI Update**: The unread count badge is reset to 0 across all components:
   - Sidebar notification badge
   - Mobile navigation badge
   - Header bell icon badge
4. **Persistence**: The read status persists in the database, so the count stays at 0 after page refresh

The `useRef` flag prevents duplicate API calls during React strict mode or re-renders.

---

## Socket Integration

### Socket Types

**File:** `src/lib/types/socket.types.ts`

```typescript
// Socket events
export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
} as const;

// Socket rooms
export const SOCKET_ROOMS = {
  client: (clientId: string) => `client:${clientId}`,
  provider: (orgId: string) => `provider:${orgId}`,
  quoteRequest: (id: string) => `quote-request:${id}`,
} as const;

// Notification payload
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
```

### Socket Service (Server)

**File:** `src/lib/services/socket.service.ts`

```typescript
// Emit to specific client
emitToClient(clientId: string, event: string, payload: any)

// Emit to provider organization
emitToProvider(organizationId: string, event: string, payload: any)
```

### Socket Context (Client)

**File:** `contexts/SocketContext.tsx`

```typescript
const { socket, isConnected, joinClientRoom, joinProviderRoom } = useSocket();

// Auto-join rooms on mount
useEffect(() => {
  if (user?.clientId) {
    joinClientRoom(user.clientId);
  }
  if (user?.organizationId) {
    joinProviderRoom(user.organizationId);
  }
}, [user]);
```

---

## Integration Flow

### Complete Lifecycle: Quote Priced

```
1. Provider prices a quote via API
   └─> POST /api/quotes/[id]/price

2. Quote service updates quote status
   └─> quoteService.priceQuote()

3. Notification service creates notification
   └─> notifyQuotePriced({
         clientId,
         quoteId,
         providerName,
         route,
         price
       })

4. Notification saved to database
   └─> Notification.create({...})

5. Socket event emitted to client room
   └─> emitToClient(clientId, 'notification:new', payload)

6. Client frontend receives event
   └─> useNotificationSubscription hook
       └─> onNewNotification callback

7. UI updates
   └─> NotificationBell: badge count +1, add to dropdown
   └─> NotificationList: prepend to list

8. User clicks notification
   └─> markAsRead(notificationId)
   └─> Navigate to /client/quotes/[quoteId]
   └─> Badge count -1
```

### Complete Lifecycle: Viewing Notifications Page

```
1. User navigates to /client/notifications (or /provider/notifications)
   └─> Page component mounts

2. useEffect triggers after 500ms delay
   └─> Calls markAllAsRead()

3. API request sent
   └─> PATCH /api/notifications/mark-all-read

4. Database updated
   └─> All unread notifications marked as read
   └─> readAt timestamp set

5. UI count reset
   └─> resetUnreadCount() called
   └─> Badge cleared from:
       - Sidebar
       - Mobile navigation
       - Header bell icon

6. Page refresh behavior
   └─> Count remains 0 (persisted in database)
   └─> Notifications still visible in list (just marked as read)
```

---

## Files Changed Summary

### New Files

| File | Purpose |
|------|---------|
| `src/lib/models/notification.model.ts` | Mongoose model |
| `src/lib/services/notification.service.ts` | Business logic |
| `src/lib/services/socket.service.ts` | Socket emit utilities |
| `src/lib/types/socket.types.ts` | Socket types and events |
| `contexts/SocketContext.tsx` | Socket.io client provider |
| `hooks/useNotifications.ts` | Data fetching hook |
| `hooks/useNotificationSubscription.ts` | Real-time subscription |
| `components/notifications/NotificationItem.tsx` | Single notification |
| `components/notifications/NotificationBell.tsx` | Header dropdown |
| `components/notifications/NotificationList.tsx` | Full page list |
| `app/api/notifications/route.ts` | List endpoint |
| `app/api/notifications/[id]/read/route.ts` | Mark read endpoint |
| `app/api/notifications/mark-all-read/route.ts` | Mark all read endpoint |
| `app/api/notifications/unread-count/route.ts` | Unread count endpoint |
| `app/(dashboard)/client/notifications/page.tsx` | Client page |
| `app/(dashboard)/provider/notifications/page.tsx` | Provider page |

### Dependencies Added

```json
{
  "socket.io": "^4.x",
  "socket.io-client": "^4.x"
}
```

---

## UI Display Rules

### Negotiation Status Badge

The "Negotiation" badge is displayed in provider views when:
- `quote.negotiationRequested === true`
- AND `quote.status !== 'lost'`
- AND `quote.status !== 'missed'`

**Rationale:** For lost or missed quotes, the negotiation status is no longer relevant since the quote is in a terminal state. Displaying it would be confusing and cluttering.

**Components updated:**
- `components/dashboard/QuoteCard.tsx`
- `components/dashboard/QuoteTable.tsx`
- `app/(dashboard)/provider/clients/[id]/page.tsx`

```typescript
// QuoteCard.tsx, QuoteTable.tsx, client detail page
{quote.negotiationRequested &&
  quote.status !== "lost" &&
  quote.status !== "missed" && (
    <span className="... bg-amber-100 text-amber-800">
      Negotiation
    </span>
  )}
```

### Terminal Status States

These statuses are considered terminal (no further actions possible):
- `rejected` - Quote was rejected
- `completed` - Shipment completed
- `lost` - Another provider was selected
- `missed` - Provider missed the pricing window

For these statuses, the UI displays "No actions" instead of action buttons.

### Status Tabs Configuration

Two helper functions generate status tabs:

**`generateStatusTabs`** - Client view (excludes lost/missed):
- all, pending, priced, approved, rejected, completed

**`generateProviderStatusTabs`** - Provider view (includes lost/missed):
- all, pending, priced, approved, rejected, completed, lost, missed

**Pages using provider tabs:**
- `/provider/quotes` - Main quotes list
- `/provider/clients/[id]` - Client detail page (quotes for specific client)

---

## Usage Examples

### Creating a Notification (Backend)

```typescript
import { notifyQuotePriced } from '@/src/lib/services/notification.service';

// In quote service after pricing
await notifyQuotePriced({
  clientId: quote.clientId,
  quoteId: quote._id,
  providerName: provider.name,
  route: `${quote.origin} → ${quote.destination}`,
  price: quote.freightCost,
});
```

### Displaying Notifications (Frontend)

```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell';

// In Header component
<NotificationBell
  clientId={user?.clientId}
  organizationId={user?.organizationId}
  userType={user?.type}
/>
```

### Subscribing to Real-time Updates

```typescript
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';

function NotificationsProvider({ children }) {
  const { addNotification } = useNotifications();
  const { increment } = useUnreadCount();

  useNotificationSubscription({
    clientId: user?.clientId,
    callbacks: {
      onNewNotification: (notification) => {
        addNotification(notification);
        increment();
        // Optionally show toast
        toast.info(notification.title);
      },
    },
  });

  return children;
}
```
