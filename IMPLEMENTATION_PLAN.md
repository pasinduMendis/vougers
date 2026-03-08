# Travel Import Parcel Management System - Implementation Plan

## Current State Analysis

### Existing Implementation
- Basic Next.js 16 setup with App Router
- MongoDB connection with mongoose
- Basic schemas: `ServiceProvider`, `Client`, `Quote`
- Partial authentication (admin/client separate tokens)
- No organization/multi-tenant structure
- No RBAC implementation
- Quote schema missing `serviceProviderId`

### Key Gaps
1. No `Organization` model for multi-tenancy
2. No `User` model with roles within organizations
3. Quote lacks `serviceProviderId` field
4. No middleware for organization isolation
5. No RBAC enforcement
6. No dashboard implementation
7. Missing MongoDB indexes

---

## Architecture Overview

```
src/
├── app/
│   ├── (auth)/                    # Auth pages (login, register)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/               # Protected dashboard routes
│   │   ├── client/                # Client dashboard
│   │   │   ├── quotes/            # List all quote requests
│   │   │   ├── quotes/new/        # Create new quote request
│   │   │   ├── quotes/[id]/       # View quote request with all provider responses
│   │   │   └── layout.tsx
│   │   └── provider/              # Service provider dashboard
│   │       ├── quotes/
│   │       ├── users/             # Admin only
│   │       └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── providers/
│   │   │   └── route.ts           # GET (list active providers for clients)
│   │   ├── quote-requests/        # Quote request management
│   │   │   ├── route.ts           # GET (list), POST (create with provider selection)
│   │   │   └── [id]/
│   │   │       └── route.ts       # GET (with all provider quotes)
│   │   ├── quotes/                # Individual provider quotes
│   │   │   ├── route.ts           # GET (list)
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET, PATCH
│   │   │       ├── price/route.ts # PATCH (provider pricing)
│   │   │       └── status/route.ts # PATCH (status changes)
│   │   └── users/                 # Provider admin only
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   └── layout.tsx
├── lib/
│   ├── db/
│   │   ├── connection.ts
│   │   └── indexes.ts
│   ├── models/
│   │   ├── organization.model.ts
│   │   ├── user.model.ts
│   │   ├── client.model.ts
│   │   ├── quote-request.model.ts  # New: groups quotes sent together
│   │   └── quote.model.ts          # Individual provider quotes
│   ├── auth/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── session.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   └── organization.middleware.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── quote-request.service.ts  # New: handles multi-provider quote creation
│   │   ├── quote.service.ts
│   │   ├── user.service.ts
│   │   └── organization.service.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── quote.validator.ts
│   │   └── user.validator.ts
│   └── types/
│       ├── auth.types.ts
│       ├── quote.types.ts
│       └── api.types.ts
├── components/
│   ├── ui/                        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Table.tsx
│   │   ├── Pagination.tsx
│   │   ├── StatusBadge.tsx
│   │   └── Modal.tsx
│   ├── forms/
│   │   ├── QuoteRequestForm.tsx       # New: includes provider selection
│   │   ├── ProviderSelector.tsx       # New: multi-select for providers
│   │   ├── LoginForm.tsx
│   │   └── UserForm.tsx
│   ├── dashboard/
│   │   ├── QuoteTable.tsx         # Desktop table
│   │   ├── QuoteCard.tsx          # Mobile card
│   │   ├── QuoteList.tsx          # Responsive wrapper
│   │   ├── QuoteComparison.tsx    # New: side-by-side provider comparison
│   │   ├── FilterPanel.tsx
│   │   └── StatusTabs.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── MobileNav.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useQuotes.ts
│   └── useMediaQuery.ts
├── constants/
│   ├── roles.ts
│   └── statuses.ts
└── middleware.ts                  # Next.js edge middleware
```

---

## Phase 1: Database Models & Indexes

### 1.1 Organization Model (Service Provider Company)
```typescript
interface IOrganization {
  _id: ObjectId;
  name: string;
  slug: string;              // URL-friendly identifier
  isActive: boolean;         // Visible to clients for selection (default: true)
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 User Model (Service Provider Users)
```typescript
interface IUser {
  _id: ObjectId;
  organizationId: ObjectId;  // FK to Organization
  name: string;
  email: string;
  password: string;          // bcrypt hashed
  role: 'admin' | 'view_edit' | 'view_only';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 Client Model (Updated)
```typescript
interface IClient {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyAddress: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.4 QuoteRequest Model (New - Groups quotes sent together)
```typescript
interface IQuoteRequest {
  _id: ObjectId;
  clientId: ObjectId;              // FK to Client

  // Shipment details (shared across all provider quotes)
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  pickupAddress?: string;
  extraFields?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}
```

### 1.5 Quote Model (Updated - Individual quote per provider)
```typescript
interface IQuote {
  _id: ObjectId;
  quoteRequestId: ObjectId;        // FK to QuoteRequest (groups related quotes)
  clientId: ObjectId;              // FK to Client (denormalized for query efficiency)
  serviceProviderId: ObjectId;     // FK to Organization

  // Pricing (set by provider)
  freightCost?: number;
  transitDays?: number;
  pricedAt?: Date;
  pricedBy?: ObjectId;             // FK to User who priced

  // Status (independent per provider)
  status: 'pending' | 'priced' | 'approved' | 'rejected' | 'completed';

  createdAt: Date;
  updatedAt: Date;
}
```

### 1.6 Data Flow: Multi-Provider Quote Request
```
┌─────────────────────────────────────────────────────────────────┐
│                      QuoteRequest                                │
│  (Contains shipment details: ports, commodity, volume, etc.)    │
│  clientId: "client_123"                                         │
│  quoteRequestId: "qr_456"                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ One QuoteRequest creates multiple Quotes
                              ▼
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    Quote 1    │    │    Quote 2    │    │    Quote 3    │
│ Provider: ABC │    │ Provider: XYZ │    │ Provider: 123 │
│ Status:pending│    │ Status:priced │    │ Status:approved│
│ Price: null   │    │ Price: $500   │    │ Price: $450   │
└───────────────┘    └───────────────┘    └───────────────┘
```

### 1.7 MongoDB Indexes
```typescript
// QuoteRequest indexes
{ clientId: 1, createdAt: -1 }

// Quote indexes
{ quoteRequestId: 1 }
{ clientId: 1, status: 1 }
{ serviceProviderId: 1, status: 1 }
{ createdAt: -1 }
{ serviceProviderId: 1, createdAt: -1 }

// User indexes
{ organizationId: 1 }
{ email: 1 } // unique

// Client indexes
{ email: 1 } // unique

// Organization indexes
{ slug: 1 } // unique
{ isActive: 1 } // for listing active providers
```

---

## Phase 2: Authentication System

### 2.1 JWT Token Structure
```typescript
// Client Token
{
  sub: string;           // clientId
  type: 'client';
  email: string;
  iat: number;
  exp: number;
}

// Provider User Token
{
  sub: string;           // userId
  type: 'provider';
  organizationId: string;
  role: 'admin' | 'view_edit' | 'view_only';
  email: string;
  iat: number;
  exp: number;
}
```

### 2.2 Cookie Configuration
```typescript
{
  name: 'auth_token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60  // 7 days
}
```

### 2.3 Auth Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register client or provider (creates org) |
| POST | `/api/auth/login` | Login (client or provider) |
| POST | `/api/auth/logout` | Clear auth cookie |
| GET | `/api/auth/me` | Get current user info |

### 2.4 Registration Flow
```
Provider Registration:
1. Validate input
2. Check email uniqueness (across Users AND Clients)
3. Create Organization
4. Create User with role='admin', organizationId
5. Return success (user logs in separately)

Client Registration:
1. Validate input
2. Check email uniqueness
3. Create Client
4. Return success
```

---

## Phase 3: RBAC & Authorization

### 3.1 Permission Matrix

| Action | Client | Admin | View & Edit | View Only |
|--------|--------|-------|-------------|-----------|
| Create quote | ✅ | - | - | - |
| View own quotes | ✅ | - | - | - |
| Edit pending quote | ✅ | - | - | - |
| Approve/Reject quote | ✅ | - | - | - |
| View org quotes | - | ✅ | ✅ | ✅ |
| Price quote | - | ✅ | ✅ | - |
| Change quote status | - | ✅ | ✅ | - |
| Mark completed | - | ✅ | ✅ | - |
| Create users | - | ✅ | - | - |
| Manage users | - | ✅ | - | - |

### 3.2 Middleware Stack
```typescript
// Order of execution:
1. authMiddleware     // Verify JWT, attach user to request
2. orgMiddleware      // For providers: filter by organizationId
3. rbacMiddleware     // Check role permissions
```

### 3.3 RBAC Helper
```typescript
const PERMISSIONS = {
  'quotes:read': ['admin', 'view_edit', 'view_only'],
  'quotes:price': ['admin', 'view_edit'],
  'quotes:status': ['admin', 'view_edit'],
  'users:read': ['admin'],
  'users:write': ['admin'],
} as const;

function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}
```

---

## Phase 4: Quote API Endpoints

### 4.1 Service Provider List Endpoint (Public for Clients)

| Method | Endpoint | Actor | Description |
|--------|----------|-------|-------------|
| GET | `/api/providers` | Client | List all active service providers |

```typescript
// GET /api/providers - Response
{
  success: true,
  data: [
    { _id: "org_1", name: "ABC Logistics", slug: "abc-logistics" },
    { _id: "org_2", name: "XYZ Shipping", slug: "xyz-shipping" },
    // ... more providers
  ]
}
```

### 4.2 Quote Request Endpoints

| Method | Endpoint | Actor | Description |
|--------|----------|-------|-------------|
| POST | `/api/quote-requests` | Client | Create quote request (sends to providers) |
| GET | `/api/quote-requests` | Client | List client's quote requests |
| GET | `/api/quote-requests/[id]` | Client | Get quote request with all provider quotes |

### 4.3 Quote Endpoints (Individual Provider Quotes)

| Method | Endpoint | Actor | Description |
|--------|----------|-------|-------------|
| GET | `/api/quotes` | Client/Provider | List quotes (filtered by role) |
| GET | `/api/quotes/[id]` | Client/Provider | Get single quote |
| PATCH | `/api/quotes/[id]` | Client | Update quote (if pending) |
| PATCH | `/api/quotes/[id]/price` | Provider | Set price on quote |
| PATCH | `/api/quotes/[id]/status` | Client/Provider | Change status |

### 4.4 Quote Request Creation Flow
```typescript
// POST /api/quote-requests - Request Body
{
  // Shipment details
  portOfLoading: "Singapore",
  portOfDischarge: "Los Angeles",
  commodity: "Electronics",
  volume: "20 CBM",
  pickupAddress: "123 Main St",

  // Provider selection (optional)
  serviceProviderIds?: string[];  // If empty/undefined, send to ALL active providers
}

// Backend Logic:
// 1. Create QuoteRequest document with shipment details
// 2. Determine target providers:
//    - If serviceProviderIds provided → use those (validate they exist & active)
//    - If empty/undefined → fetch ALL active organizations
// 3. Create individual Quote document for EACH provider
//    - Each quote has status: 'pending', links to QuoteRequest
// 4. Return QuoteRequest with created quotes

// Response
{
  success: true,
  data: {
    quoteRequest: {
      _id: "qr_123",
      portOfLoading: "Singapore",
      // ... other details
    },
    quotes: [
      { _id: "q_1", serviceProviderId: "org_1", status: "pending" },
      { _id: "q_2", serviceProviderId: "org_2", status: "pending" },
      { _id: "q_3", serviceProviderId: "org_3", status: "pending" },
    ],
    sentToProviders: 3
  }
}
```

### 4.5 Client Quote Request View
```typescript
// GET /api/quote-requests/[id] - Client sees all provider responses
{
  success: true,
  data: {
    quoteRequest: {
      _id: "qr_123",
      portOfLoading: "Singapore",
      portOfDischarge: "Los Angeles",
      // ... shipment details
    },
    quotes: [
      {
        _id: "q_1",
        provider: { _id: "org_1", name: "ABC Logistics" },
        status: "pending",
        freightCost: null,
        transitDays: null
      },
      {
        _id: "q_2",
        provider: { _id: "org_2", name: "XYZ Shipping" },
        status: "priced",
        freightCost: 500,
        transitDays: 14
      },
      {
        _id: "q_3",
        provider: { _id: "org_3", name: "123 Freight" },
        status: "priced",
        freightCost: 450,
        transitDays: 12
      }
    ]
  }
}
```

### 4.6 Query Parameters (GET /api/quotes)
```typescript
{
  status?: string;        // Filter by status
  search?: string;        // Search in ports, commodity
  sortBy?: string;        // Field to sort by
  sortOrder?: 'asc' | 'desc';
  page?: number;          // Default: 1
  limit?: number;         // Default: 10, max: 50
}
```

### 4.7 Status Transition Rules
```typescript
const VALID_TRANSITIONS = {
  // Client actions
  client: {
    pending: [],              // No change allowed (waiting for provider)
    priced: ['approved', 'rejected'],
    approved: [],
    rejected: [],
    completed: [],
  },
  // Provider actions
  provider: {
    pending: ['priced'],
    priced: [],
    approved: ['completed'],
    rejected: [],
    completed: [],
  },
} as const;
```

### 4.8 Business Rules for Multi-Provider Quotes
```
1. Client can approve MULTIPLE quotes from different providers
   - Each quote is independent
   - Approving Quote A doesn't affect Quote B

2. Client can approve only ONE quote (optional stricter rule)
   - If this rule is needed: approving one quote auto-rejects others
   - Configurable via environment variable

3. Provider only sees quotes sent to their organization
   - Never sees other providers' quotes or pricing

4. Client sees comparison view
   - All provider responses side by side
   - Easy to compare prices and transit times
```

---

## Phase 5: Dashboard Implementation

### 5.1 Responsive Strategy
```
Breakpoints:
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md-lg)
- Desktop: > 1024px (xl)
```

### 5.2 Component Rendering
```typescript
// QuoteList.tsx - Responsive wrapper
function QuoteList({ quotes, userType }) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  if (isMobile) {
    return <QuoteCards quotes={quotes} />;
  }

  return <QuoteTable quotes={quotes} compact={isTablet} />;
}
```

### 5.3 Mobile Features
- Card-based layout
- Status tabs for quick filtering
- Swipe actions for approve/reject
- Sticky bottom action bar

### 5.4 Desktop Features
- Full data table with all columns
- Inline status badges
- Bulk selection (future)
- Advanced filters sidebar

### 5.5 Server Components Strategy
```
Server Components (RSC):
- Page layouts
- Initial data fetching
- Static UI elements

Client Components:
- Interactive filters
- Status tabs
- Action buttons
- Forms
```

---

## Phase 6: User Management (Provider Admin)

### 6.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List org users |
| POST | `/api/users` | Create new user |
| GET | `/api/users/[id]` | Get user details |
| PATCH | `/api/users/[id]` | Update user |
| DELETE | `/api/users/[id]` | Deactivate user |

### 6.2 User Creation Flow
```
1. Admin initiates user creation
2. Validate email uniqueness
3. Generate temporary password
4. Create user with organizationId from admin's token
5. Send welcome email (future)
6. Return success
```

---

## Implementation Order

### Sprint 1: Foundation (Days 1-2)
- [ ] Create new models (Organization, User, QuoteRequest)
- [ ] Update Quote model with quoteRequestId, serviceProviderId
- [ ] Set up MongoDB indexes
- [ ] Create type definitions

### Sprint 2: Authentication (Days 3-4)
- [ ] Implement JWT utils
- [ ] Create auth middleware
- [ ] Build registration endpoints (client & provider)
- [ ] Build login endpoint
- [ ] Build logout endpoint
- [ ] Create /api/auth/me endpoint

### Sprint 3: RBAC & Authorization (Day 5)
- [ ] Create RBAC middleware
- [ ] Create organization isolation middleware
- [ ] Define permission constants
- [ ] Integrate middleware into API routes

### Sprint 4: Provider & Quote Request APIs (Days 6-7)
- [ ] GET /api/providers (list active providers for clients)
- [ ] POST /api/quote-requests (create with provider selection)
- [ ] GET /api/quote-requests (list client's requests)
- [ ] GET /api/quote-requests/[id] (with all provider quotes)

### Sprint 5: Quote APIs (Day 8)
- [ ] GET /api/quotes (with pagination, filters)
- [ ] GET /api/quotes/[id]
- [ ] PATCH /api/quotes/[id]/price
- [ ] PATCH /api/quotes/[id]/status
- [ ] Implement status transition validation

### Sprint 6: User Management (Day 9)
- [ ] GET /api/users
- [ ] POST /api/users
- [ ] PATCH /api/users/[id]
- [ ] DELETE /api/users/[id]

### Sprint 7: UI Components (Days 10-11)
- [ ] Build UI primitives (Button, Input, Card, Checkbox, etc.)
- [ ] Build ProviderSelector component (multi-select with "Select All")
- [ ] Build QuoteRequestForm component
- [ ] Build QuoteTable component
- [ ] Build QuoteCard component
- [ ] Build QuoteComparison component (side-by-side view)
- [ ] Build responsive QuoteList wrapper
- [ ] Build FilterPanel component
- [ ] Build StatusTabs component
- [ ] Build Pagination component

### Sprint 8: Dashboard Pages (Days 12-13)
- [ ] Client dashboard layout
- [ ] Client quote requests list page
- [ ] Client new quote request page (with provider selection)
- [ ] Client quote request detail page (comparison view)
- [ ] Provider dashboard layout
- [ ] Provider quotes page
- [ ] Provider users page (admin)

### Sprint 9: Auth Pages & Middleware (Day 14)
- [ ] Login page
- [ ] Register page (with type selection)
- [ ] Next.js edge middleware for route protection
- [ ] Redirect logic

### Sprint 10: Testing & Polish (Day 15)
- [ ] Test all API endpoints
- [ ] Test multi-provider quote flow
- [ ] Test responsive layouts
- [ ] Test RBAC permissions
- [ ] Fix edge cases

---

## File Creation Order

```
Phase 1: Types & Constants
├── lib/types/auth.types.ts
├── lib/types/quote.types.ts
├── lib/types/api.types.ts
├── constants/roles.ts
└── constants/statuses.ts

Phase 2: Database
├── lib/db/connection.ts
├── lib/db/indexes.ts
├── lib/models/organization.model.ts
├── lib/models/user.model.ts
├── lib/models/client.model.ts (update)
├── lib/models/quote-request.model.ts (new)
└── lib/models/quote.model.ts (update)

Phase 3: Auth & Middleware
├── lib/auth/jwt.ts
├── lib/auth/password.ts
├── lib/auth/session.ts
├── lib/middleware/auth.middleware.ts
├── lib/middleware/rbac.middleware.ts
├── lib/middleware/organization.middleware.ts
└── middleware.ts

Phase 4: Validators
├── lib/validators/auth.validator.ts
├── lib/validators/quote-request.validator.ts (new)
├── lib/validators/quote.validator.ts
└── lib/validators/user.validator.ts

Phase 5: Services
├── lib/services/auth.service.ts
├── lib/services/quote-request.service.ts (new)
├── lib/services/quote.service.ts
├── lib/services/user.service.ts
└── lib/services/organization.service.ts

Phase 6: API Routes
├── app/api/auth/register/route.ts (rewrite)
├── app/api/auth/login/route.ts (rewrite)
├── app/api/auth/logout/route.ts
├── app/api/auth/me/route.ts
├── app/api/providers/route.ts (new - list active providers)
├── app/api/quote-requests/route.ts (new - create & list)
├── app/api/quote-requests/[id]/route.ts (new - get with quotes)
├── app/api/quotes/route.ts
├── app/api/quotes/[id]/route.ts
├── app/api/quotes/[id]/price/route.ts
├── app/api/quotes/[id]/status/route.ts
├── app/api/users/route.ts
└── app/api/users/[id]/route.ts

Phase 7: UI Components
├── components/ui/Button.tsx
├── components/ui/Input.tsx
├── components/ui/Card.tsx
├── components/ui/Table.tsx
├── components/ui/Checkbox.tsx (new)
├── components/ui/Pagination.tsx
├── components/ui/StatusBadge.tsx
├── components/ui/Modal.tsx
├── components/dashboard/QuoteTable.tsx
├── components/dashboard/QuoteCard.tsx
├── components/dashboard/QuoteList.tsx
├── components/dashboard/QuoteComparison.tsx (new - provider comparison)
├── components/dashboard/FilterPanel.tsx
├── components/dashboard/StatusTabs.tsx
├── components/forms/QuoteRequestForm.tsx (new - with provider selection)
├── components/forms/ProviderSelector.tsx (new - multi-select)
├── components/forms/LoginForm.tsx
├── components/forms/UserForm.tsx
├── components/layout/Sidebar.tsx
├── components/layout/Header.tsx
└── components/layout/MobileNav.tsx

Phase 8: Pages
├── app/(auth)/login/page.tsx
├── app/(auth)/register/page.tsx
├── app/(dashboard)/client/layout.tsx
├── app/(dashboard)/client/quotes/page.tsx (list quote requests)
├── app/(dashboard)/client/quotes/new/page.tsx (new - create with provider selection)
├── app/(dashboard)/client/quotes/[id]/page.tsx (new - comparison view)
├── app/(dashboard)/provider/layout.tsx
├── app/(dashboard)/provider/quotes/page.tsx
└── app/(dashboard)/provider/users/page.tsx

Phase 9: Hooks
├── hooks/useAuth.ts
├── hooks/useQuotes.ts
├── hooks/useProviders.ts (new)
└── hooks/useMediaQuery.ts
```

---

## Provider Selection UI Specification

### ProviderSelector Component
```typescript
interface ProviderSelectorProps {
  providers: Provider[];           // List of all active providers
  selectedIds: string[];           // Currently selected provider IDs
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

// Provider type
interface Provider {
  _id: string;
  name: string;
  slug: string;
}
```

### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Select Service Providers                                    │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ☑ Select All (sends to all providers)                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ ABC Logistics                                      │    │
│  │ ☑ XYZ Shipping Co.                                   │    │
│  │ ☑ FastFreight International                          │    │
│  │ ☐ Ocean Express Ltd.                                 │    │
│  │ ☐ Global Cargo Services                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Selected: 3 of 5 providers                                  │
└─────────────────────────────────────────────────────────────┘
```

### Behavior
```
1. Default state: "Select All" checked → all providers selected
2. Unchecking "Select All" → allows individual selection
3. Checking all individual providers → auto-checks "Select All"
4. At least ONE provider must be selected (validation)
5. Empty selection not allowed

Mobile: Scrollable list with touch-friendly checkboxes
Desktop: Grid or list view with hover states
```

### Quote Request Form Integration
```typescript
// QuoteRequestForm.tsx
function QuoteRequestForm() {
  const { data: providers } = useProviders();  // Fetch active providers
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // On form submit
  const handleSubmit = async (formData) => {
    const payload = {
      ...formData,
      // If selectAll is true, send empty array (backend interprets as "all")
      // Otherwise send specific IDs
      serviceProviderIds: selectAll ? [] : selectedProviderIds,
    };

    await createQuoteRequest(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Shipment details fields */}
      <Input name="portOfLoading" />
      <Input name="portOfDischarge" />
      {/* ... */}

      {/* Provider selection */}
      <ProviderSelector
        providers={providers}
        selectedIds={selectedProviderIds}
        onChange={setSelectedProviderIds}
        selectAll={selectAll}
        onSelectAllChange={setSelectAll}
      />

      <Button type="submit">Send Quote Request</Button>
    </form>
  );
}
```

---

## Key Design Decisions

### 1. Single Auth Token
Use one `auth_token` cookie for both clients and providers. The token payload includes `type` field to differentiate.

### 2. Organization Isolation
All provider queries automatically filter by `organizationId` from the token. This is enforced at middleware level, not in individual route handlers.

### 3. Status Transitions
Status changes are validated against a transition matrix. Invalid transitions return 400 error.

### 4. Soft Delete for Users
Users are deactivated (isActive=false) rather than deleted. This preserves audit trail.

### 5. Server Components First
Use RSC for data fetching and static UI. Use client components only for interactivity.

### 6. Mobile-First CSS
All styles start from mobile and use min-width breakpoints to add desktop features.

### 7. QuoteRequest + Quote Separation
- **QuoteRequest**: Contains shipment details, belongs to client
- **Quote**: Individual pricing response from each provider
- This separation allows:
  - One form submission → multiple provider quotes
  - Each provider prices independently
  - Client compares all responses in one view
  - Clean data model for analytics

### 8. Provider Selection Default
- Default behavior: Send to ALL active providers
- Client can optionally select specific providers
- Backend validates selected provider IDs exist and are active

---

## Security Checklist

- [x] Passwords hashed with bcrypt (cost factor 10)
- [x] JWT in HTTP-only cookie
- [x] CSRF protection via SameSite=strict
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all endpoints
- [ ] Organization isolation in all queries
- [ ] Role validation before sensitive actions
- [ ] No sensitive data in client bundle

---

## Performance Checklist

- [ ] MongoDB indexes on frequently queried fields
- [ ] Server-side pagination (never fetch all)
- [ ] Lean queries where possible
- [ ] React Server Components for initial load
- [ ] Lazy load dashboard components
- [ ] Debounced search input

---

## Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/voyagers

# Authentication
JWT_SECRET=your-secure-secret-key-min-32-chars

# Environment
NODE_ENV=development
```

---

## Notes

1. This plan prioritizes simplicity and readability over premature optimization
2. The architecture supports horizontal scaling if needed later
3. All API responses follow consistent format: `{ success: boolean, data?: T, error?: string }`
4. Error messages are user-friendly, not exposing internal details
