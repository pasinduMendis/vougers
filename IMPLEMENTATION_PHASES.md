# Implementation Phases - Detailed Breakdown

## Overview
- **Total Duration**: 15 Days (10 Sprints)
- **Approach**: Backend-first, then UI
- **Testing**: Continuous throughout

---

## Phase 1: Foundation (Days 1-2)

### Day 1: Types & Constants

#### Task 1.1: Create Type Definitions
**File**: `lib/types/auth.types.ts`
```typescript
// User types
export type UserType = 'client' | 'provider';
export type ProviderRole = 'admin' | 'view_edit' | 'view_only';

// JWT Payload types
export interface ClientTokenPayload {
  sub: string;
  type: 'client';
  email: string;
}

export interface ProviderTokenPayload {
  sub: string;
  type: 'provider';
  organizationId: string;
  role: ProviderRole;
  email: string;
}

// Auth request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterClientRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyAddress: string;
}

export interface RegisterProviderRequest {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}
```

#### Task 1.2: Create Quote Types
**File**: `lib/types/quote.types.ts`
```typescript
export type QuoteStatus = 'pending' | 'priced' | 'approved' | 'rejected' | 'completed';

export interface CreateQuoteRequestPayload {
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  pickupAddress?: string;
  serviceProviderIds?: string[];  // Empty = all providers
  extraFields?: Record<string, unknown>;
}

export interface PriceQuotePayload {
  freightCost: number;
  transitDays: number;
}

export interface QuoteFilters {
  status?: QuoteStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

#### Task 1.3: Create API Response Types
**File**: `lib/types/api.types.ts`
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### Task 1.4: Create Constants
**File**: `constants/roles.ts`
```typescript
export const PROVIDER_ROLES = {
  ADMIN: 'admin',
  VIEW_EDIT: 'view_edit',
  VIEW_ONLY: 'view_only',
} as const;

export const PERMISSIONS = {
  'quotes:read': ['admin', 'view_edit', 'view_only'],
  'quotes:price': ['admin', 'view_edit'],
  'quotes:status': ['admin', 'view_edit'],
  'users:read': ['admin'],
  'users:write': ['admin'],
} as const;
```

**File**: `constants/statuses.ts`
```typescript
export const QUOTE_STATUSES = {
  PENDING: 'pending',
  PRICED: 'priced',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;

export const VALID_TRANSITIONS = {
  client: {
    pending: [],
    priced: ['approved', 'rejected'],
    approved: [],
    rejected: [],
    completed: [],
  },
  provider: {
    pending: ['priced'],
    priced: [],
    approved: ['completed'],
    rejected: [],
    completed: [],
  },
} as const;
```

---

### Day 2: Database Models

#### Task 2.1: Update Database Connection
**File**: `lib/db/connection.ts`
```typescript
// Copy from existing lib/mongoDB.ts with improvements
// Add connection event logging
// Add error handling
```

#### Task 2.2: Create Organization Model
**File**: `lib/models/organization.model.ts`
```typescript
interface IOrganization {
  _id: ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task 2.3: Create User Model
**File**: `lib/models/user.model.ts`
```typescript
interface IUser {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'view_edit' | 'view_only';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task 2.4: Update Client Model
**File**: `lib/models/client.model.ts`
- Keep existing structure
- Ensure indexes are defined

#### Task 2.5: Create QuoteRequest Model
**File**: `lib/models/quote-request.model.ts`
```typescript
interface IQuoteRequest {
  _id: ObjectId;
  clientId: ObjectId;
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

#### Task 2.6: Update Quote Model
**File**: `lib/models/quote.model.ts`
```typescript
interface IQuote {
  _id: ObjectId;
  quoteRequestId: ObjectId;
  clientId: ObjectId;
  serviceProviderId: ObjectId;
  freightCost?: number;
  transitDays?: number;
  pricedAt?: Date;
  pricedBy?: ObjectId;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task 2.7: Create Database Indexes
**File**: `lib/db/indexes.ts`
```typescript
// Function to ensure all indexes exist
// Call on app startup
export async function ensureIndexes() {
  // QuoteRequest indexes
  await QuoteRequest.collection.createIndex({ clientId: 1, createdAt: -1 });

  // Quote indexes
  await Quote.collection.createIndex({ quoteRequestId: 1 });
  await Quote.collection.createIndex({ clientId: 1, status: 1 });
  await Quote.collection.createIndex({ serviceProviderId: 1, status: 1 });
  await Quote.collection.createIndex({ createdAt: -1 });

  // User indexes
  await User.collection.createIndex({ organizationId: 1 });
  await User.collection.createIndex({ email: 1 }, { unique: true });

  // Organization indexes
  await Organization.collection.createIndex({ slug: 1 }, { unique: true });
  await Organization.collection.createIndex({ isActive: 1 });
}
```

### Day 2 Checklist
- [ ] All models created
- [ ] All indexes defined
- [ ] Test database connection
- [ ] Verify models compile without errors

---

## Phase 2: Authentication (Days 3-4)

### Day 3: Auth Utilities & Middleware

#### Task 3.1: JWT Utilities
**File**: `lib/auth/jwt.ts`
```typescript
// Functions:
// - signToken(payload): string
// - verifyToken(token): payload | null
// - decodeToken(token): payload (without verification)
```

#### Task 3.2: Password Utilities
**File**: `lib/auth/password.ts`
```typescript
// Functions:
// - hashPassword(plain): Promise<string>
// - comparePassword(plain, hashed): Promise<boolean>
```

#### Task 3.3: Session Utilities
**File**: `lib/auth/session.ts`
```typescript
// Functions:
// - createAuthCookie(token): cookie string
// - clearAuthCookie(): cookie string
// - getTokenFromRequest(req): string | null
```

#### Task 3.4: Auth Middleware
**File**: `lib/middleware/auth.middleware.ts`
```typescript
// Functions:
// - withAuth(handler): wrapped handler that verifies JWT
// - getCurrentUser(req): user payload from token
```

---

### Day 4: Auth Endpoints

#### Task 4.1: Registration Endpoint
**File**: `app/api/auth/register/route.ts`
```typescript
// POST /api/auth/register
// Body: { type: 'client' | 'provider', ...data }
//
// If type === 'client':
//   - Create Client document
// If type === 'provider':
//   - Create Organization
//   - Create User with role='admin'
```

#### Task 4.2: Login Endpoint
**File**: `app/api/auth/login/route.ts`
```typescript
// POST /api/auth/login
// Body: { email, password }
//
// 1. Check Client collection
// 2. If not found, check User collection
// 3. Verify password
// 4. Generate JWT based on user type
// 5. Set HTTP-only cookie
```

#### Task 4.3: Logout Endpoint
**File**: `app/api/auth/logout/route.ts`
```typescript
// POST /api/auth/logout
// Clear auth cookie
```

#### Task 4.4: Current User Endpoint
**File**: `app/api/auth/me/route.ts`
```typescript
// GET /api/auth/me
// Return current user info from JWT
// Include organization name for providers
```

### Day 4 Checklist
- [ ] Registration works for both client and provider
- [ ] Login works for both client and provider
- [ ] JWT contains correct payload
- [ ] Cookie is HTTP-only and secure
- [ ] /me endpoint returns correct user info

---

## Phase 3: RBAC & Authorization (Day 5)

### Day 5: Middleware & Permissions

#### Task 5.1: RBAC Middleware
**File**: `lib/middleware/rbac.middleware.ts`
```typescript
// Functions:
// - requireRole(...roles): middleware
// - requirePermission(permission): middleware
// - hasPermission(role, permission): boolean
```

#### Task 5.2: Organization Middleware
**File**: `lib/middleware/organization.middleware.ts`
```typescript
// Functions:
// - withOrgIsolation(handler): adds organizationId filter
// - getOrganizationId(req): string from token
```

#### Task 5.3: Next.js Edge Middleware
**File**: `middleware.ts`
```typescript
// Route protection:
// - /client/* → requires client token
// - /provider/* → requires provider token
// - /provider/users/* → requires admin role
// - Redirect unauthenticated to /login
```

#### Task 5.4: Create Auth Guard Helpers
**File**: `lib/auth/guards.ts`
```typescript
// Functions:
// - requireClient(req): throws if not client
// - requireProvider(req): throws if not provider
// - requireProviderRole(req, ...roles): throws if not authorized
```

### Day 5 Checklist
- [ ] RBAC middleware blocks unauthorized access
- [ ] Organization isolation works correctly
- [ ] Edge middleware redirects properly
- [ ] Test all role combinations

---

## Phase 4: Provider & Quote Request APIs (Days 6-7)

### Day 6: Provider List & Quote Request Creation

#### Task 6.1: List Providers Endpoint
**File**: `app/api/providers/route.ts`
```typescript
// GET /api/providers
// Returns all active organizations
// Public for authenticated clients
// Response: { success: true, data: [{ _id, name, slug }] }
```

#### Task 6.2: Quote Request Validator
**File**: `lib/validators/quote-request.validator.ts`
```typescript
// Functions:
// - validateCreateQuoteRequest(body): validated data | errors
// - validateProviderIds(ids): valid ids | errors
```

#### Task 6.3: Quote Request Service
**File**: `lib/services/quote-request.service.ts`
```typescript
// Functions:
// - createQuoteRequest(clientId, data): QuoteRequest + Quotes
// - getQuoteRequestsByClient(clientId, filters): paginated
// - getQuoteRequestById(id, clientId): QuoteRequest with quotes
```

#### Task 6.4: Create Quote Request Endpoint
**File**: `app/api/quote-requests/route.ts`
```typescript
// POST /api/quote-requests
// 1. Validate input
// 2. Determine target providers
// 3. Create QuoteRequest
// 4. Create Quote for each provider
// 5. Return QuoteRequest with quotes

// GET /api/quote-requests
// List client's quote requests with pagination
```

---

### Day 7: Quote Request Detail & Quote Listing

#### Task 7.1: Get Quote Request Detail
**File**: `app/api/quote-requests/[id]/route.ts`
```typescript
// GET /api/quote-requests/[id]
// Returns QuoteRequest with all provider quotes
// Includes provider names
// Only accessible by owning client
```

#### Task 7.2: Quote Service
**File**: `lib/services/quote.service.ts`
```typescript
// Functions:
// - getQuotesByClient(clientId, filters): paginated
// - getQuotesByProvider(orgId, filters): paginated
// - getQuoteById(id): Quote with details
// - priceQuote(id, orgId, userId, price): updated Quote
// - updateQuoteStatus(id, actorType, actorId, newStatus): updated Quote
```

#### Task 7.3: List Quotes Endpoint
**File**: `app/api/quotes/route.ts`
```typescript
// GET /api/quotes
// If client: return quotes for their requests
// If provider: return quotes for their organization
// Support pagination, filtering, sorting
```

### Days 6-7 Checklist
- [ ] GET /api/providers returns active providers
- [ ] POST /api/quote-requests creates request + quotes
- [ ] GET /api/quote-requests lists client's requests
- [ ] GET /api/quote-requests/[id] returns detail with quotes
- [ ] GET /api/quotes filters by user type correctly

---

## Phase 5: Quote APIs (Day 8)

### Day 8: Quote Operations

#### Task 8.1: Get Single Quote
**File**: `app/api/quotes/[id]/route.ts`
```typescript
// GET /api/quotes/[id]
// Client: can view if they own the quote request
// Provider: can view if quote is for their org
```

#### Task 8.2: Price Quote Endpoint
**File**: `app/api/quotes/[id]/price/route.ts`
```typescript
// PATCH /api/quotes/[id]/price
// Provider only (admin or view_edit)
// Body: { freightCost, transitDays }
// Sets status to 'priced', records pricedAt and pricedBy
```

#### Task 8.3: Update Quote Status
**File**: `app/api/quotes/[id]/status/route.ts`
```typescript
// PATCH /api/quotes/[id]/status
// Body: { status }
// Validates transition based on actor type
// Client: priced → approved/rejected
// Provider: approved → completed
```

#### Task 8.4: Quote Validator
**File**: `lib/validators/quote.validator.ts`
```typescript
// Functions:
// - validatePriceQuote(body): validated | errors
// - validateStatusTransition(current, next, actorType): boolean
```

### Day 8 Checklist
- [ ] GET /api/quotes/[id] respects access rules
- [ ] PATCH /api/quotes/[id]/price works for providers
- [ ] Status transitions validate correctly
- [ ] Timestamps recorded properly

---

## Phase 6: User Management (Day 9)

### Day 9: Provider User CRUD

#### Task 9.1: User Service
**File**: `lib/services/user.service.ts`
```typescript
// Functions:
// - getUsersByOrg(orgId): User[]
// - createUser(orgId, data): User
// - updateUser(id, orgId, data): User
// - deactivateUser(id, orgId): User
```

#### Task 9.2: User Validator
**File**: `lib/validators/user.validator.ts`
```typescript
// Functions:
// - validateCreateUser(body): validated | errors
// - validateUpdateUser(body): validated | errors
```

#### Task 9.3: List & Create Users
**File**: `app/api/users/route.ts`
```typescript
// GET /api/users
// Admin only - list org users

// POST /api/users
// Admin only - create new user
// Body: { name, email, password, role }
```

#### Task 9.4: Update & Delete User
**File**: `app/api/users/[id]/route.ts`
```typescript
// GET /api/users/[id]
// Admin only - get user details

// PATCH /api/users/[id]
// Admin only - update user (name, role, isActive)

// DELETE /api/users/[id]
// Admin only - soft delete (isActive = false)
```

### Day 9 Checklist
- [ ] Only admins can access user endpoints
- [ ] Users are scoped to organization
- [ ] Email uniqueness enforced
- [ ] Soft delete works correctly

---

## Phase 7: UI Components (Days 10-11)

### Day 10: Core UI Components

#### Task 10.1: Button Component
**File**: `components/ui/Button.tsx`
```typescript
// Variants: primary, secondary, danger, ghost
// Sizes: sm, md, lg
// States: loading, disabled
```

#### Task 10.2: Input Component
**File**: `components/ui/Input.tsx`
```typescript
// Types: text, email, password, number
// States: error, disabled
// With label and error message
```

#### Task 10.3: Card Component
**File**: `components/ui/Card.tsx`
```typescript
// Variants: default, bordered, elevated
// Sections: header, body, footer
```

#### Task 10.4: Checkbox Component
**File**: `components/ui/Checkbox.tsx`
```typescript
// States: checked, indeterminate, disabled
// With label
```

#### Task 10.5: Table Component
**File**: `components/ui/Table.tsx`
```typescript
// Features: sortable headers, responsive
// Sub-components: Table, Thead, Tbody, Tr, Th, Td
```

#### Task 10.6: Pagination Component
**File**: `components/ui/Pagination.tsx`
```typescript
// Props: page, totalPages, onPageChange
// Show page numbers with ellipsis
```

#### Task 10.7: StatusBadge Component
**File**: `components/ui/StatusBadge.tsx`
```typescript
// Colors based on status
// pending: yellow
// priced: blue
// approved: green
// rejected: red
// completed: gray
```

#### Task 10.8: Modal Component
**File**: `components/ui/Modal.tsx`
```typescript
// Features: backdrop, close button, animations
// Trap focus for accessibility
```

---

### Day 11: Dashboard & Form Components

#### Task 11.1: Provider Selector
**File**: `components/forms/ProviderSelector.tsx`
```typescript
// Props: providers, selectedIds, onChange, selectAll
// Features:
// - "Select All" checkbox
// - Individual provider checkboxes
// - Selected count display
```

#### Task 11.2: Quote Request Form
**File**: `components/forms/QuoteRequestForm.tsx`
```typescript
// Fields: portOfLoading, portOfDischarge, commodity, volume, pickupAddress
// Includes ProviderSelector
// Submit creates quote request
```

#### Task 11.3: Quote Table (Desktop)
**File**: `components/dashboard/QuoteTable.tsx`
```typescript
// Columns vary by user type
// Client: provider, status, price, transit, actions
// Provider: client, ports, status, actions
// Sortable columns
```

#### Task 11.4: Quote Card (Mobile)
**File**: `components/dashboard/QuoteCard.tsx`
```typescript
// Compact card for mobile view
// Shows key info + status badge
// Action buttons at bottom
```

#### Task 11.5: Quote List (Responsive)
**File**: `components/dashboard/QuoteList.tsx`
```typescript
// Switches between Table and Cards based on viewport
// Uses useMediaQuery hook
```

#### Task 11.6: Quote Comparison
**File**: `components/dashboard/QuoteComparison.tsx`
```typescript
// Side-by-side provider quotes
// Highlight best price
// Action buttons for each quote
```

#### Task 11.7: Filter Panel
**File**: `components/dashboard/FilterPanel.tsx`
```typescript
// Status filter dropdown
// Search input
// Sort options
// Collapsible on tablet
```

#### Task 11.8: Status Tabs
**File**: `components/dashboard/StatusTabs.tsx`
```typescript
// Quick filter tabs for mobile
// All, Pending, Priced, Approved, etc.
```

### Days 10-11 Checklist
- [ ] All UI components render correctly
- [ ] Responsive breakpoints work
- [ ] Forms validate input
- [ ] Accessibility basics covered

---

## Phase 8: Dashboard Pages (Days 12-13)

### Day 12: Client Dashboard

#### Task 12.1: Client Layout
**File**: `app/(dashboard)/client/layout.tsx`
```typescript
// Sidebar navigation
// Header with user info
// Mobile navigation
```

#### Task 12.2: Quote Requests List Page
**File**: `app/(dashboard)/client/quotes/page.tsx`
```typescript
// Server component for initial data
// List all quote requests
// Filter by status
// Pagination
```

#### Task 12.3: New Quote Request Page
**File**: `app/(dashboard)/client/quotes/new/page.tsx`
```typescript
// QuoteRequestForm component
// Fetch providers on mount
// Redirect after success
```

#### Task 12.4: Quote Request Detail Page
**File**: `app/(dashboard)/client/quotes/[id]/page.tsx`
```typescript
// Show shipment details
// QuoteComparison component
// Action buttons for approve/reject
```

---

### Day 13: Provider Dashboard

#### Task 13.1: Provider Layout
**File**: `app/(dashboard)/provider/layout.tsx`
```typescript
// Sidebar with role-based navigation
// Header with org name
// Mobile navigation
```

#### Task 13.2: Provider Quotes Page
**File**: `app/(dashboard)/provider/quotes/page.tsx`
```typescript
// List quotes for organization
// Filter by status
// Pagination
// Price action for pending quotes
```

#### Task 13.3: Provider Users Page (Admin)
**File**: `app/(dashboard)/provider/users/page.tsx`
```typescript
// Only visible to admin role
// List org users
// Create/Edit/Deactivate users
```

#### Task 13.4: Layout Components
**Files**:
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`
- `components/layout/MobileNav.tsx`

### Days 12-13 Checklist
- [ ] Client can create quote requests
- [ ] Client can view and compare quotes
- [ ] Client can approve/reject quotes
- [ ] Provider can view assigned quotes
- [ ] Provider can price quotes
- [ ] Admin can manage users

---

## Phase 9: Auth Pages & Middleware (Day 14)

### Day 14: Auth UI & Protection

#### Task 14.1: Login Page
**File**: `app/(auth)/login/page.tsx`
```typescript
// Email + password form
// Redirect based on user type after login
// Link to register
```

#### Task 14.2: Register Page
**File**: `app/(auth)/register/page.tsx`
```typescript
// Type selection: Client or Provider
// Different form fields based on type
// Link to login
```

#### Task 14.3: Login Form Component
**File**: `components/forms/LoginForm.tsx`
```typescript
// Client-side form with validation
// Loading state during submission
// Error display
```

#### Task 14.4: Update Edge Middleware
**File**: `middleware.ts`
```typescript
// Finalize route protection rules
// Handle redirects properly
// Exclude public routes
```

### Day 14 Checklist
- [ ] Login page works for both user types
- [ ] Register creates correct user type
- [ ] Protected routes redirect to login
- [ ] Logged-in users redirect to dashboard

---

## Phase 10: Testing & Polish (Day 15)

### Day 15: Final Testing

#### Task 15.1: API Testing
```
Test all endpoints:
- [ ] POST /api/auth/register (client)
- [ ] POST /api/auth/register (provider)
- [ ] POST /api/auth/login
- [ ] POST /api/auth/logout
- [ ] GET /api/auth/me
- [ ] GET /api/providers
- [ ] POST /api/quote-requests
- [ ] GET /api/quote-requests
- [ ] GET /api/quote-requests/[id]
- [ ] GET /api/quotes
- [ ] GET /api/quotes/[id]
- [ ] PATCH /api/quotes/[id]/price
- [ ] PATCH /api/quotes/[id]/status
- [ ] GET /api/users
- [ ] POST /api/users
- [ ] PATCH /api/users/[id]
- [ ] DELETE /api/users/[id]
```

#### Task 15.2: Flow Testing
```
Test complete flows:
- [ ] Client registration → login → create quote → compare → approve
- [ ] Provider registration → login → view quotes → price → complete
- [ ] Admin → create user → user login → view quotes
- [ ] Multi-provider quote request flow
```

#### Task 15.3: Responsive Testing
```
Test on devices:
- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px)
```

#### Task 15.4: RBAC Testing
```
Test permissions:
- [ ] View-only cannot price quotes
- [ ] View-only cannot manage users
- [ ] View-edit can price but not manage users
- [ ] Admin has full access
- [ ] Client cannot access provider routes
- [ ] Provider cannot access client routes
```

#### Task 15.5: Edge Cases
```
- [ ] Empty provider list handling
- [ ] No quotes found state
- [ ] Invalid status transitions blocked
- [ ] Duplicate email handling
- [ ] Session expiry handling
```

#### Task 15.6: Performance Check
```
- [ ] Verify indexes are used (explain queries)
- [ ] Check pagination works correctly
- [ ] Test with larger datasets
```

---

## Quick Reference: File Creation Order

### Backend Files (Days 1-9)
```
lib/types/auth.types.ts
lib/types/quote.types.ts
lib/types/api.types.ts
constants/roles.ts
constants/statuses.ts
lib/db/connection.ts
lib/db/indexes.ts
lib/models/organization.model.ts
lib/models/user.model.ts
lib/models/client.model.ts
lib/models/quote-request.model.ts
lib/models/quote.model.ts
lib/auth/jwt.ts
lib/auth/password.ts
lib/auth/session.ts
lib/auth/guards.ts
lib/middleware/auth.middleware.ts
lib/middleware/rbac.middleware.ts
lib/middleware/organization.middleware.ts
lib/validators/auth.validator.ts
lib/validators/quote-request.validator.ts
lib/validators/quote.validator.ts
lib/validators/user.validator.ts
lib/services/auth.service.ts
lib/services/organization.service.ts
lib/services/quote-request.service.ts
lib/services/quote.service.ts
lib/services/user.service.ts
app/api/auth/register/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/me/route.ts
app/api/providers/route.ts
app/api/quote-requests/route.ts
app/api/quote-requests/[id]/route.ts
app/api/quotes/route.ts
app/api/quotes/[id]/route.ts
app/api/quotes/[id]/price/route.ts
app/api/quotes/[id]/status/route.ts
app/api/users/route.ts
app/api/users/[id]/route.ts
middleware.ts
```

### Frontend Files (Days 10-14)
```
components/ui/Button.tsx
components/ui/Input.tsx
components/ui/Card.tsx
components/ui/Checkbox.tsx
components/ui/Table.tsx
components/ui/Pagination.tsx
components/ui/StatusBadge.tsx
components/ui/Modal.tsx
components/forms/ProviderSelector.tsx
components/forms/QuoteRequestForm.tsx
components/forms/LoginForm.tsx
components/forms/UserForm.tsx
components/dashboard/QuoteTable.tsx
components/dashboard/QuoteCard.tsx
components/dashboard/QuoteList.tsx
components/dashboard/QuoteComparison.tsx
components/dashboard/FilterPanel.tsx
components/dashboard/StatusTabs.tsx
components/layout/Sidebar.tsx
components/layout/Header.tsx
components/layout/MobileNav.tsx
hooks/useAuth.ts
hooks/useQuotes.ts
hooks/useProviders.ts
hooks/useMediaQuery.ts
app/(auth)/login/page.tsx
app/(auth)/register/page.tsx
app/(dashboard)/client/layout.tsx
app/(dashboard)/client/quotes/page.tsx
app/(dashboard)/client/quotes/new/page.tsx
app/(dashboard)/client/quotes/[id]/page.tsx
app/(dashboard)/provider/layout.tsx
app/(dashboard)/provider/quotes/page.tsx
app/(dashboard)/provider/users/page.tsx
```

---

## Daily Summary

| Day | Phase | Key Deliverables |
|-----|-------|------------------|
| 1 | Foundation | Types, Constants |
| 2 | Foundation | Models, Indexes |
| 3 | Auth | JWT, Password, Middleware |
| 4 | Auth | Register, Login, Logout, Me |
| 5 | RBAC | Permissions, Guards, Edge MW |
| 6 | APIs | Providers, Quote Requests |
| 7 | APIs | Quote Request Detail, Quotes List |
| 8 | APIs | Quote Price, Status |
| 9 | APIs | User CRUD |
| 10 | UI | Core Components |
| 11 | UI | Dashboard Components |
| 12 | Pages | Client Dashboard |
| 13 | Pages | Provider Dashboard |
| 14 | Pages | Auth Pages, Final MW |
| 15 | Testing | Full System Testing |
