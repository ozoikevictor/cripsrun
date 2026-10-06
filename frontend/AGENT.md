# CrispRun — Food Ordering & Delivery Platform
## Google AntiGravity Agent Context Document

> **READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.**
> This is the single source of truth for all architecture, business logic, and conventions.
> Reference `/skills/` for deep implementation guides on each domain.
> Platform: Google AntiGravity (AI Studio) + Next.js + Firebase

---

## 1. Project Overview

**CrispRun** is a B2C food ordering and delivery platform built for the Nigerian market.

### Business Identity
- The **platform itself is the only vendor/store** — not a marketplace.
- All products are sourced, priced, and sold by the business.
- Customers order online; the business dispatches and manages delivery.

### Phase Roadmap
| Phase | Logistics Model | Status |
|---|---|---|
| Phase 1 | Third-party providers (Gokada, Uber Direct, Bolt Food, Glovo) | **Current Build** |
| Phase 2 | Proprietary fleet (company-owned motorcycles + employed riders) | Future |

---

## 2. Revenue Model (Business-Critical)

There are **three distinct revenue streams**. Track each separately in every order.

| Stream | Description | Stored Field |
|---|---|---|
| **Delivery Spread** | Charge customer more than logistics cost (e.g., charge ₦3,000, pay Gokada ₦2,500 → retain ₦500) | `delivery_spread` |
| **Service Charge** | Flat ₦500–₦1,000 per order, charged on top of delivery fee | `service_charge` |
| **Product Markup** | Margin embedded in `price_per_kg` at the product level | (implicit in subtotal) |

### Service Charge Ring-Fence Rule
> **RULE:** All service charge revenue is legally and operationally ring-fenced.
> It funds **only** the Phase 2 proprietary logistics fleet.
> The `RevenueRecord` collection tracks this separately. It must NEVER be commingled with operating revenue.

### Pricing Example
```
Customer pays:    ₦3,000 delivery + ₦1,000 service charge
Platform pays:    ₦2,500 to Gokada
Platform retains: ₦500 delivery spread + ₦1,000 service charge = ₦1,500 net
```

### Competitor Benchmark
- Observed competitor: ₦2,800 delivery + ₦1,000 service charge per order.

---

## 3. Product System

### Two Product Types

| Type | Delivery Availability | Configuration |
|---|---|---|
| `REGULAR` | Any day of the week | No delivery day restriction |
| `PERISHABLE` | Specific days only (e.g., Tuesdays) | `delivery_days[]` + `cutoff_hours` per product |

### Weight-Based Ordering (kg)
- All products are sold **by weight in kilograms**.
- Each product has its own `min_kg` (varies per product — e.g., 0.5 kg for pepper, 2 kg for beef).
- Optional `max_kg` cap per product.
- `kg_increment` defines the step size (e.g., 0.5 kg increments).
- **Price formula:** `unit_price_per_kg × kg_quantity = line_total`
- All monetary values stored in **kobo** (integer). Display by dividing by 100.

### Mixed Cart Rule
If a cart contains both REGULAR and PERISHABLE items:
- Option A: **Split delivery** — two separate delivery dates, two delivery fees.
- Option B: **Single delivery** — customer picks a date that satisfies ALL perishable constraints (intersection of allowed days).
- The checkout flow MUST present this choice explicitly.

---

## 4. User Roles

| Role | Access |
|---|---|
| `customer` | Browse catalog, manage cart, place orders, track delivery, manage account & addresses |
| `admin` | Full platform — products, orders, pricing, zones, logistics config, reports |

> There is NO vendor role. There is NO rider/driver role in Phase 1.

---

## 5. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 14 (App Router) + TypeScript | Server components + API routes |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent, accessible UI |
| **Database** | Cloud Firestore (Firebase) | NoSQL, real-time capable |
| **Auth** | Firebase Authentication | Email/password + phone OTP |
| **Storage** | Firebase Storage | Product images |
| **Backend Functions** | Firebase Cloud Functions (Node.js 20) | Webhooks, scheduled jobs |
| **Payments** | Paystack | Nigerian-native: card, USSD, bank transfer |
| **SMS** | Termii | Nigerian provider, cheaper rates |
| **Email** | Resend | Developer-friendly transactional email |
| **Maps** | Google Maps Platform | Places Autocomplete + Distance Matrix |
| **State (client)** | Zustand | Cart state, UI state |
| **Validation** | Zod | All inputs, API request bodies |
| **Deployment** | Firebase Hosting + Cloud Run | See Section 11 |

---

## 6. Folder Structure

```
/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Auth pages
│   │   ├── login/
│   │   ├── register/
│   │   └── verify-phone/
│   ├── (customer)/                 # Customer-facing pages
│   │   ├── catalog/                # Product listing + filtering
│   │   ├── product/[slug]/         # Product detail page
│   │   ├── cart/                   # Cart page
│   │   ├── checkout/               # Multi-step checkout
│   │   ├── orders/                 # Order history
│   │   ├── orders/[orderId]/       # Order detail + tracking
│   │   └── account/                # Profile, saved addresses
│   ├── (admin)/                    # Admin panel — role-protected
│   │   ├── dashboard/              # Overview metrics
│   │   ├── products/               # Product CRUD
│   │   ├── categories/             # Category management
│   │   ├── orders/                 # Order management + dispatch
│   │   ├── zones/                  # Delivery zone management
│   │   ├── pricing/                # Fee config (spread, service charge)
│   │   ├── logistics/              # Logistics provider config
│   │   └── reports/                # Revenue reports, ring-fenced tracking
│   └── api/                        # Next.js API routes
│       ├── auth/
│       ├── products/
│       ├── cart/
│       ├── orders/
│       ├── checkout/
│       ├── payments/
│       │   └── webhook/            # Paystack webhook endpoint
│       ├── logistics/
│       └── admin/
├── components/
│   ├── ui/                         # shadcn components
│   ├── catalog/                    # ProductCard, FilterBar, CategoryTabs
│   ├── cart/                       # CartDrawer, CartItem, KgSelector
│   ├── checkout/                   # DeliveryDatePicker, AddressSelect, OrderSummary
│   ├── orders/                     # OrderCard, OrderTimeline, StatusBadge
│   └── admin/                      # DataTable, MetricCard, ZoneMap
├── lib/
│   ├── firebase/                   # Firebase SDK setup
│   │   ├── client.ts               # Client-side Firebase app
│   │   └── admin.ts                # Server-side Firebase Admin SDK
│   ├── firestore/                  # Firestore helpers per collection
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── users.ts
│   │   └── zones.ts
│   ├── paystack/                   # Paystack SDK wrapper
│   ├── termii/                     # SMS client
│   ├── resend/                     # Email client
│   ├── maps/                       # Google Maps helpers
│   ├── logistics/                  # Logistics provider abstraction
│   │   ├── providers/
│   │   │   ├── gokada.ts
│   │   │   ├── uber-direct.ts
│   │   │   ├── bolt.ts
│   │   │   └── glovo.ts
│   │   ├── factory.ts              # Provider selection logic
│   │   └── types.ts                # Shared logistics types
│   ├── pricing/                    # Fee calculation engine
│   │   └── calculator.ts
│   ├── scheduling/                 # Delivery date validation
│   │   └── validator.ts
│   └── validators/                 # Zod schemas
│       ├── product.schema.ts
│       ├── order.schema.ts
│       ├── checkout.schema.ts
│       └── zone.schema.ts
├── store/
│   ├── cart.store.ts               # Zustand cart store
│   └── ui.store.ts                 # UI state (modals, drawers)
├── types/
│   ├── product.types.ts
│   ├── order.types.ts
│   ├── user.types.ts
│   └── logistics.types.ts
├── hooks/
│   ├── useCart.ts
│   ├── useProducts.ts
│   ├── useOrders.ts
│   └── useDeliveryDates.ts
├── functions/                      # Firebase Cloud Functions
│   ├── src/
│   │   ├── payments/               # Paystack webhook handler
│   │   ├── notifications/          # SMS/email triggers
│   │   ├── orders/                 # Order processing jobs
│   │   └── scheduled/             # Cron jobs (stock alerts, reports)
│   └── package.json
├── firestore.rules                 # Firestore Security Rules
├── storage.rules                   # Firebase Storage Security Rules
├── firebase.json
├── .env.local                      # Local env variables
├── AGENT.md                        # This file
└── skills/                         # AI agent skill guides
```

---

## 7. Firestore Data Model

### Collections Overview
```
users/{userId}
  └── addresses/{addressId}
  └── cart_items/{cartItemId}

categories/{categoryId}

products/{productId}
  └── delivery_days/{dayId}

orders/{orderId}
  └── items/{itemId}
  └── status_history/{entryId}

delivery_zones/{zoneId}

revenue_records/{recordId}

config/
  └── pricing            (service charge range, default spread)
  └── logistics          (active providers, priority order)
  └── platform           (maintenance mode, feature flags)
```

### Document Structures

**products/{productId}**
```typescript
{
  id: string
  name: string
  slug: string              // URL-friendly, unique
  description: string
  category_id: string
  product_type: 'REGULAR' | 'PERISHABLE'
  price_per_kg: number      // in kobo (integer)
  min_kg: number            // e.g., 0.5
  max_kg: number | null     // e.g., 10, or null for no cap
  kg_increment: number      // e.g., 0.5
  stock_kg: number          // available stock in kg
  low_stock_threshold: number
  image_urls: string[]
  is_active: boolean
  is_featured: boolean
  created_at: Timestamp
  updated_at: Timestamp
}
```

**products/{productId}/delivery_days/{dayId}**
```typescript
{
  day_of_week: number       // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  cutoff_hours: number      // hours before midnight of delivery day
}
```

**orders/{orderId}**
```typescript
{
  id: string
  order_number: string      // "CR-20240115-0042" (human-readable)
  user_id: string
  address: {                // snapshot at order time
    full_address: string
    lat: number
    lng: number
    instructions: string | null
  }
  zone_id: string
  status: OrderStatus
  // ── Pricing breakdown (all in kobo) ──
  subtotal: number
  delivery_fee: number      // what customer pays for delivery
  logistics_cost: number    // what platform pays to courier (INTERNAL, never expose)
  delivery_spread: number   // delivery_fee - logistics_cost
  service_charge: number    // ₦500–₦1,000 flat fee
  total_amount: number      // subtotal + delivery_fee + service_charge
  // ── Delivery ──
  delivery_date: Timestamp
  delivery_type: 'SINGLE' | 'SPLIT'
  delivery_notes: string | null
  // ── Payment ──
  payment_reference: string | null
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  payment_channel: string | null
  paid_at: Timestamp | null
  // ── Logistics ──
  logistics_provider: string | null
  logistics_order_id: string | null  // provider's reference
  tracking_url: string | null
  // ── Meta ──
  created_at: Timestamp
  updated_at: Timestamp
}
```

**revenue_records/{recordId}**
```typescript
{
  order_id: string          // unique reference
  service_charge: number    // kobo — ring-fenced for fleet fund
  delivery_spread: number   // kobo — operational revenue
  subtotal: number          // kobo — product revenue
  ring_fenced_amount: number // equals service_charge
  recorded_at: Timestamp
}
```

---

## 8. Order Lifecycle (State Machine)

```
PENDING_PAYMENT
    │
    ▼ (Paystack webhook: payment.success)
PAYMENT_CONFIRMED
    │
    ▼ (Admin confirms + dispatches to logistics)
PROCESSING
    │
    ▼ (Logistics provider accepts)
AWAITING_PICKUP
    │
    ▼ (Rider picks up order)
IN_TRANSIT
    │
    ▼ (Rider marks delivered)
DELIVERED ✓

Any state before IN_TRANSIT → CANCELLED (by admin or customer)
IN_TRANSIT or DELIVERED → FAILED_DELIVERY (by admin if issue arises)
```

**Rules:**
- Every transition MUST write a `status_history` sub-document with timestamp and actor.
- Customer can only cancel before `PROCESSING` (after payment, must contact admin for refund).
- SMS + email notification fires on every status change.

---

## 9. Non-Negotiable Business Rules

1. **Perishable delivery days**: A perishable item MUST NOT be schedulable on any day not in its `delivery_days` array.
2. **Cutoff enforcement**: Orders for perishable items must be rejected at API level if placed after the cutoff.
3. **Minimum kg**: Enforced in the cart UI AND validated server-side in the API.
4. **Kobo storage**: All monetary amounts stored as integers (kobo). Never store as floats.
5. **logistics_cost is INTERNAL**: Never expose `logistics_cost` or `delivery_spread` to the customer-facing API.
6. **Ring-fence**: Write a `revenue_records` document for every successfully paid order. Non-negotiable.
7. **State machine**: Order status transitions must follow the defined lifecycle. Invalid transitions must return 400.
8. **Webhook security**: Paystack webhooks MUST be verified with HMAC-SHA512 before processing.
9. **Admin access**: Admin routes return 403 immediately if the requesting user's role is not `admin`.
10. **Soft delete**: Products are never hard-deleted. Set `is_active: false` instead.

---

## 10. API Conventions

- All API routes under `/api/` follow RESTful conventions.
- **Standard response envelope:**
  ```typescript
  {
    success: boolean
    data?: any
    error?: string
    message?: string
    pagination?: { page: number, limit: number, total: number }
  }
  ```
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error.
- Pagination: `?page=1&limit=20` on list endpoints.
- Currency in API responses: always in **kobo** (divide by 100 for display).
- Timestamps: ISO 8601 strings in responses.

---

## 11. Deployment (Security-First Recommendation)

### Recommended Stack: Firebase Hosting + Cloud Run

| Service | Purpose | Why |
|---|---|---|
| **Firebase Hosting** | Serve Next.js static assets + CDN | Built into Antigravity workflow, global CDN, free SSL |
| **Cloud Run** | Host Next.js server (SSR + API routes) | Auto-scales to zero, HTTPS enforced, container isolation |
| **Cloud Firestore** | Database | Managed, encrypted at rest, RLS via Security Rules |
| **Firebase Authentication** | Auth | Battle-tested, phone OTP built-in, free tier |
| **Firebase Storage** | Product images | Signed URLs, access rules |
| **Cloud Functions** | Webhooks + background jobs | Secure, serverless, auto-scaled |

### Alternative: Vercel + Firebase
- Use Vercel for the Next.js app (excellent DX, edge network, zero-config SSL)
- Keep Firebase for Auth, Firestore, Storage, and Functions
- Best choice if the team prefers Vercel's deployment pipeline

### Security Deployment Checklist
- [ ] All environment variables in Cloud Secret Manager (not `.env` in production)
- [ ] Firestore Security Rules deployed and tested
- [ ] Firebase Storage Security Rules deployed
- [ ] Cloud Run service account has minimal permissions (least privilege)
- [ ] Paystack webhook IP allowlist configured
- [ ] Custom domain with HTTPS enforced (HSTS header)
- [ ] Cloud Armor (DDoS protection) on Cloud Run load balancer
- [ ] Enable Firebase App Check to block non-app traffic
- [ ] Rate limiting on Cloud Functions and API routes

---

## 12. Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Paystack
PAYSTACK_SECRET_KEY=                     # SERVER ONLY - never expose
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

# Termii (SMS)
TERMII_API_KEY=                          # SERVER ONLY
TERMII_SENDER_ID=CrispRun

# Resend (Email)
RESEND_API_KEY=                          # SERVER ONLY
RESEND_FROM_EMAIL=orders@crisprun.ng

# Google Maps
GOOGLE_MAPS_API_KEY=                     # Restrict to your domains in GCP console

# App
NEXT_PUBLIC_APP_URL=https://crisprun.ng
APP_SECRET=                              # 32-byte random hex for HMAC signing
NODE_ENV=production

# Logistics APIs
GOKADA_API_KEY=                          # SERVER ONLY
UBER_DIRECT_CLIENT_ID=                   # SERVER ONLY
UBER_DIRECT_CLIENT_SECRET=               # SERVER ONLY
BOLT_API_KEY=                            # SERVER ONLY
GLOVO_API_KEY=                           # SERVER ONLY

# Pricing Defaults (can override in Firestore config)
DEFAULT_SERVICE_CHARGE_KOBO=75000        # ₦750 default
DEFAULT_DELIVERY_SPREAD_KOBO=50000       # ₦500 default spread
```

> **Security:** In production, store all secrets in **Google Cloud Secret Manager**, not `.env` files.
> Never commit `.env.local` to version control. Add it to `.gitignore` immediately.

---

## 13. Skills Reference Index

| File | Domain | Use When |
|---|---|---|
| `skills/01-database-schema.md` | Firestore schema | Defining or querying collections |
| `skills/02-auth-security.md` | Auth + security | Auth flows, middleware, Firestore rules |
| `skills/03-product-management.md` | Products + catalog | Product CRUD, kg logic, perishable config |
| `skills/04-cart-and-checkout.md` | Cart + checkout | Cart operations, mixed delivery logic |
| `skills/05-delivery-scheduling.md` | Date scheduling | Date picker rules, cutoff enforcement |
| `skills/06-payment-integration.md` | Paystack | Payment initiation, webhooks, refunds |
| `skills/07-logistics-integration.md` | Couriers | Third-party dispatch, Phase 1/2 abstraction |
| `skills/08-order-management.md` | Orders | Order lifecycle, state machine, history |
| `skills/09-admin-panel.md` | Admin | Dashboard, product/order/zone management |
| `skills/10-notifications.md` | SMS + Email | Notification triggers, templates |
| `skills/11-delivery-zones.md` | Zones | Zone CRUD, distance validation |
| `skills/12-pricing-revenue-logic.md` | Pricing | Fee engine, service charge, ring-fencing |

---

*Version: 1.0.0 | Platform: Google AntiGravity + Firebase*
*This file is the authoritative project context. Update it whenever architectural decisions change.*
