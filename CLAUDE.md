# Voyagers Development Guide - Agent Instructions

## Project Overview

A freight quote management system with two user types:
- **Clients**: Request quotes for shipping
- **Providers**: Price and manage quotes

Built with Next.js 15 App Router, MongoDB/Mongoose, and Tailwind CSS.

---

## Architecture

```
app/                        # Next.js App Router
├── (auth)/                 # Login/Register pages (no layout)
├── (dashboard)/            # Protected dashboard routes
│   ├── client/             # Client-specific routes
│   │   ├── layout.tsx      # Client auth guard
│   │   └── quotes/         # Quote management
│   └── provider/           # Provider-specific routes
│       ├── layout.tsx      # Provider auth guard
│       ├── clients/        # Client management
│       ├── quotes/         # Quote management
│       └── users/          # User management
├── api/                    # API routes
│   ├── auth/               # Authentication endpoints
│   ├── clients/            # Client data endpoints
│   ├── quotes/             # Quote management
│   ├── quote-requests/     # Quote request management
│   └── users/              # User management
components/
├── ui/                     # Base UI components (Button, Input, Modal, Card)
├── forms/                  # Form components (LoginForm, QuoteRequestForm)
├── dashboard/              # Dashboard components (QuoteCard, StatusTabs)
└── layout/                 # Layout components (Header, Sidebar)
hooks/                      # Custom React hooks
├── useAuth.ts              # Authentication state
├── useQuotes.ts            # Quote data fetching
├── useClients.ts           # Client data fetching
└── useProviders.ts         # Provider data fetching
src/lib/
├── auth/                   # Authentication utilities
│   ├── jwt.ts              # Token signing/verification
│   ├── guards.ts           # Route protection guards
│   ├── session.ts          # Cookie management
│   └── password.ts         # Password hashing
├── db/                     # Database connection
├── models/                 # Mongoose models
│   ├── user.model.ts       # Provider users
│   ├── client.model.ts     # Client users
│   ├── organization.model.ts
│   ├── quote.model.ts
│   └── quote-request.model.ts
├── services/               # Business logic layer
│   ├── auth.service.ts
│   ├── quote.service.ts
│   └── user.service.ts
├── validators/             # Input validation
├── types/                  # TypeScript types
└── utils.ts                # Utility functions (cn for Tailwind)
src/constants/
├── roles.ts                # Provider roles & permissions
├── statuses.ts             # Quote status transitions
└── theme.ts                # Theme constants
```

---

## Key Patterns

### 1. API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { guardProvider } from '@/src/lib/auth/guards';
import { validateInput } from '@/src/lib/validators/resource.validator';
import { resourceService } from '@/src/lib/services/resource.service';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication guard
    const authResult = await guardProvider();
    if (!authResult.success) return authResult.response;

    // 2. Parse and validate input
    const body = await request.json();
    const validation = validateInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // 3. Call service layer
    const result = await resourceService(validation.data);
    if (!result.success) {
      return NextResponse.json(errorResponse(result.error), { status: 400 });
    }

    // 4. Return standardized response
    return NextResponse.json(successResponse(result.data), { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}
```

### 2. Data Transformation (IMPORTANT!)

When returning data from API, always include ALL needed fields:

```typescript
// CORRECT - Include all fields the frontend needs
const transformedQuotes = quotes.map((quote) => ({
  _id: quote._id,
  status: quote.status,
  freightCost: quote.freightCost,
  transitDays: quote.transitDays,
  pricedAt: quote.pricedAt,
  // Don't forget negotiation fields!
  negotiationRequested: quote.negotiationRequested,
  negotiationMessage: quote.negotiationMessage,
  negotiationRequestedAt: quote.negotiationRequestedAt,
  priceHistory: quote.priceHistory,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
  quoteRequest: quote.quoteRequestId,
}));

// WRONG - Missing fields will cause UI features to not work
const transformedQuotes = quotes.map((quote) => ({
  _id: quote._id,
  status: quote.status,
  // Missing negotiationRequested, etc.
}));
```

### 3. Authentication Guards

```typescript
// Available guards in /src/lib/auth/guards.ts
await guardAuth();           // Any authenticated user
await guardClient();         // Client users only
await guardProvider();       // Provider users only
await guardAdmin();          // Provider admins only
await guardEditor();         // Providers with admin/view_edit roles
await guardClientOrProvider(); // Either type

// Usage
const authResult = await guardProvider();
if (!authResult.success) return authResult.response;

// Access user info
const orgId = getOrgId(authResult.payload);
const userId = getUserId(authResult.payload);
```

### 4. Hook Pattern

```typescript
"use client";

import { useState, useEffect, useCallback } from 'react';

export interface ResourceItem {
  _id: string;
  name: string;
  // Include all fields from API response
}

export function useResources(filters?: Filters) {
  const [data, setData] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);

      const res = await fetch(`/api/resources?${params}`, {
        credentials: 'include', // IMPORTANT: Always include for auth
      });
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      setError('Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refresh: fetch };
}
```

### 5. UI Component Pattern

```typescript
"use client";

import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

export interface ComponentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
}

const Component = forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const variants = {
      default: "bg-white border-gray-200",
      primary: "bg-indigo-600 text-white",
      danger: "bg-red-600 text-white",
    };

    const sizes = {
      sm: "p-2 text-sm",
      md: "p-4 text-base",
      lg: "p-6 text-lg",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl transition-all",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Component.displayName = "Component";
export { Component };
```

### 6. Modal Pattern

```typescript
// State management
const [modalOpen, setModalOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

// Open modal with data
const handleOpenModal = (item: Item) => {
  setSelectedItem(item);
  setModalOpen(true);
};

// Close and reset
const handleCloseModal = () => {
  setModalOpen(false);
  setSelectedItem(null);
};

// Modal component
<Modal
  isOpen={modalOpen}
  onClose={handleCloseModal}
  title="Modal Title"
  size="lg" // sm | md | lg | xl
>
  {selectedItem && (
    <div>
      {/* Modal content */}
    </div>
  )}
  <ModalFooter>
    <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
    <Button variant="primary" onClick={handleAction}>Confirm</Button>
  </ModalFooter>
</Modal>
```

---

## Quote Lifecycle

### Status Transitions

```
Client creates quote request
         ↓
    [pending] ←─────────────────────────┐
         │                              │
    Provider actions:                   │
    - Price quote → [priced]            │
    - Reject → [rejected]               │
         │                              │
    [priced] ←──────────────────────────┤
         │                              │
    Client actions:                     │
    - Approve → [approved]              │
    - Reject → [rejected]               │
    - Request negotiation ──────────────┘
         │                    (stays priced, sets negotiationRequested)
    [approved]
         │
    Provider action:
    - Complete → [completed]
         │
    [completed] (terminal)

    [rejected] (terminal)
```

### Negotiation Fields

When a client requests negotiation on a priced quote:
- `negotiationRequested: true`
- `negotiationMessage: "Client's message"`
- `negotiationRequestedAt: Date`

Provider can then revise the price, which:
- Updates `freightCost` and `transitDays`
- Adds entry to `priceHistory[]`
- Resets `negotiationRequested: false`

---

## Common Tasks

### Adding a New Field to Existing Feature

1. **Update Mongoose Model** (`/src/lib/models/`)
   ```typescript
   newField: {
     type: String,
     default: null,
   },
   ```

2. **Update API Response** - Transform to include field
   ```typescript
   const transformed = items.map(item => ({
     ...existingFields,
     newField: item.newField, // Add here!
   }));
   ```

3. **Update Hook Interface** (`/hooks/`)
   ```typescript
   export interface ItemType {
     newField?: string; // Add here!
   }
   ```

4. **Update UI** - Display the field
   ```typescript
   {item.newField && <span>{item.newField}</span>}
   ```

### Adding a New API Endpoint

1. Create route file: `app/api/resource/route.ts`
2. Add validator: `src/lib/validators/resource.validator.ts`
3. Add service: `src/lib/services/resource.service.ts`
4. Add types: `src/lib/types/resource.types.ts`

### Adding a New Page

1. Create page: `app/(dashboard)/provider/resource/page.tsx`
2. Create hook: `hooks/useResource.ts`
3. Create components as needed

---

## Important Conventions

### Always Do

- Use `credentials: 'include'` for all fetch calls
- Use guards for API authentication
- Transform ObjectIds to strings in API responses
- Use `cn()` utility for Tailwind class merging
- Include `displayName` on forwardRef components
- Use `as const` for constant objects
- Handle loading and error states in hooks

### Never Do

- Access models directly in API routes (use services)
- Forget to include fields in API transformations
- Use hardcoded colors (use Tailwind classes)
- Skip validation in API routes

---

## Response Formats

### Success Response
```typescript
{
  success: true,
  data: { ... },
  message?: "Optional message"
}
```

### Error Response
```typescript
{
  success: false,
  error: "Error type",
  message: "Detailed message"
}
```

### Paginated Response
```typescript
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10
  }
}
```

---

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/voyagers
JWT_SECRET=your-secret-key-minimum-32-characters
```

---

## Useful Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```
