# Voyagers - Travel Import Parcel Management System

A multi-tenant quote management system for travel import services, connecting clients with service providers.

## Overview

- **Clients**: Request shipping quotes from multiple service providers
- **Service Providers**: Organizations that provide shipping quotes with RBAC (Role-Based Access Control)
- **Quote Workflow**: Request -> Price -> Approve/Reject -> Complete

---

## Routing Paths

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Home page - Auto-redirects to `/login` if not authenticated, or to `/client/quotes` or `/provider/quotes` based on user type |
| `/login` | Login page - Unified login for both clients and providers. Redirects authenticated users to their respective dashboards |
| `/register` | Registration page - Create new client or provider account with type selection |

---

### Client Dashboard (Requires Client Authentication)

| Route | Description |
|-------|-------------|
| `/client/quotes` | **Quote Requests List** - View all quote requests created by the client. Supports filtering by status, search, and pagination |
| `/client/quotes/new` | **Create Quote Request** - Form to create a new quote request. Select providers, enter parcel details (item type, weight, dimensions, origin, destination) |
| `/client/quotes/[id]` | **Quote Request Detail** - View a specific quote request with comparison of all provider quotes. Approve or reject priced quotes |

---

### Provider Dashboard (Requires Provider Authentication)

| Route | Description |
|-------|-------------|
| `/provider/quotes` | **Provider Quotes List** - View all quote requests assigned to the organization. Filter by status, search quotes. Price pending quotes (requires admin or view_edit role) |
| `/provider/users` | **User Management** (Admin Only) - Manage organization users. Create, edit, deactivate users. Assign roles (admin, view_edit, view_only) |

---

## API Routes

### Authentication APIs

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| `POST` | `/api/auth/register` | Register a new client or provider account. Creates organization for providers | Public |
| `POST` | `/api/auth/login` | Unified login for clients and providers. Returns user data and sets HTTP-only auth cookie | Public |
| `POST` | `/api/auth/logout` | Clear authentication cookie and log out user | Authenticated |
| `GET` | `/api/auth/me` | Get current authenticated user information from token | Authenticated |

---

### Provider APIs

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| `GET` | `/api/providers` | List all active service provider organizations. Used by clients when creating quote requests | Client Only |

---

### Quote Request APIs

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| `POST` | `/api/quote-requests` | Create a new quote request. Sends to selected providers (creates individual Quote for each provider) | Client Only |
| `GET` | `/api/quote-requests` | List all quote requests for the authenticated client. Supports pagination, search, and sorting | Client Only |
| `GET` | `/api/quote-requests/[id]` | Get a specific quote request with all associated provider quotes | Client Only |

---

### Quote APIs

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| `GET` | `/api/quotes` | List quotes. Clients see their quotes, providers see quotes assigned to their organization | Authenticated |
| `GET` | `/api/quotes/[id]` | Get a specific quote with full details | Owner (Client or Provider) |
| `PATCH` | `/api/quotes/[id]/price` | Set price on a quote (freightCost, transitDays). Changes status from 'pending' to 'priced' | Provider (admin, view_edit) |
| `PATCH` | `/api/quotes/[id]/status` | Update quote status. Clients: approve/reject priced quotes. Providers: mark approved as completed | Owner + Permission |

**Quote Status Flow:**
```
pending -> priced (provider prices)
priced -> approved (client approves) OR rejected (client rejects)
approved -> completed (provider marks done)
```

---

### User Management APIs

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| `GET` | `/api/users` | List all users in the organization. Supports pagination, filter by role/status | Provider Admin |
| `POST` | `/api/users` | Create a new user in the organization. Assign name, email, password, role | Provider Admin |
| `GET` | `/api/users/[id]` | Get a specific user's details | Provider Admin |
| `PATCH` | `/api/users/[id]` | Update user details (name, email, role, isActive). Cannot deactivate self | Provider Admin |
| `DELETE` | `/api/users/[id]` | Soft delete (deactivate) a user. Cannot delete self | Provider Admin |

---

## Role-Based Access Control (RBAC)

### Provider User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access - price quotes, manage users, view all quotes |
| `view_edit` | Price quotes, update status, view quotes (no user management) |
| `view_only` | Read-only access to quotes (cannot price or update status) |

---

## Authentication Flow

1. User registers as Client or Provider at `/register`
2. For providers, an Organization is created and user becomes admin
3. User logs in at `/login`
4. JWT token is set as HTTP-only cookie
5. Middleware checks authentication and redirects based on user type:
   - Clients -> `/client/quotes`
   - Providers -> `/provider/quotes`
6. API routes validate token and check permissions

---

## Quote Request Workflow

### For Clients:
1. **Create Request**: Go to `/client/quotes/new`, select providers, enter parcel details
2. **Wait for Prices**: Quote requests appear on `/client/quotes` with status "pending"
3. **Compare Quotes**: When priced, view `/client/quotes/[id]` to compare provider prices
4. **Approve/Reject**: Choose the best quote and approve it, reject others

### For Providers:
1. **View Requests**: Quote requests appear on `/provider/quotes`
2. **Price Quotes**: Click "Price" button, enter freight cost and transit days
3. **Wait for Approval**: Client reviews and approves/rejects
4. **Complete**: Mark approved quotes as completed when service is delivered

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing (minimum 32 characters) |

---

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with HTTP-only cookies
- **Styling**: Tailwind CSS
- **Language**: TypeScript

---

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Run development server: `npm run dev`
5. Open `http://localhost:3000`

---

## Project Structure

```
app/
├── (auth)/                    # Auth route group
│   ├── login/page.tsx         # Login page
│   └── register/page.tsx      # Registration page
├── (dashboard)/               # Dashboard route group
│   ├── client/                # Client dashboard
│   │   ├── layout.tsx         # Client layout with auth check
│   │   └── quotes/
│   │       ├── page.tsx       # Quote requests list
│   │       ├── new/page.tsx   # Create quote request
│   │       └── [id]/page.tsx  # Quote request detail
│   └── provider/              # Provider dashboard
│       ├── layout.tsx         # Provider layout with role check
│       ├── quotes/page.tsx    # Provider quotes list
│       └── users/page.tsx     # User management (admin)
├── api/                       # API routes
│   ├── auth/                  # Authentication endpoints
│   ├── providers/             # Provider list endpoint
│   ├── quote-requests/        # Quote request endpoints
│   ├── quotes/                # Quote endpoints
│   └── users/                 # User management endpoints
└── page.tsx                   # Home page

components/
├── ui/                        # Base UI components
├── forms/                     # Form components
├── dashboard/                 # Dashboard-specific components
└── layout/                    # Layout components (Sidebar, Header)

hooks/                         # Custom React hooks
src/
├── constants/                 # Role and status constants
└── lib/
    ├── auth/                  # JWT, password, session utilities
    ├── db/                    # Database connection and indexes
    ├── middleware/            # Auth, RBAC, organization middleware
    ├── models/                # Mongoose models
    ├── services/              # Business logic services
    ├── types/                 # TypeScript type definitions
    └── validators/            # Input validation
```
