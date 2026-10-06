# CrispRun — AntiGravity Workspace Rules
# This file is loaded automatically before every conversation in this project.
# For deep implementation context, see AGENT.md and skills in .agent/skills/

---

## Identity
- Platform name: **CrispRun**
- Type: B2C food ordering and delivery — we are the ONLY vendor/store
- Market: Nigeria (Lagos-first)
- Stack: Next.js 14 App Router + TypeScript + Firebase + Tailwind CSS + shadcn/ui

---

## Absolute Rules (Never Violate)

### Money
- ALL monetary values stored as **integers in kobo** (₦1 = 100 kobo)
- NEVER store money as floats or decimals
- Display formula: `kobo / 100` using `formatCurrency()` from `lib/utils/format.ts`
- API responses: return kobo; the frontend converts for display

### Security
- `logistics_cost` and `delivery_spread` are **INTERNAL ONLY**
  → NEVER include them in any customer-facing API response
  → They exist in: order documents, revenue_records, and admin APIs only
- `PAYSTACK_SECRET_KEY` is SERVER-ONLY — never in client bundle
- Every admin route MUST start with:
  ```typescript
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  ```
- Paystack webhook: `verifyPaystackSignature()` MUST run before any processing
- Never hard-delete Firestore documents — set `is_active: false`

### Revenue Ring-Fence
- A `revenue_records` document MUST be written for every successfully paid order
- `ring_fenced_amount` = `service_charge` exactly — these are earmarked for Phase 2 fleet
- Ring-fenced funds are NEVER used for operating expenses — admin panel shows them separately

### Order State Machine
Valid transitions only (see AGENT.md Section 8 for full map):
```
PENDING_PAYMENT → PAYMENT_CONFIRMED → PROCESSING → AWAITING_PICKUP → IN_TRANSIT → DELIVERED
Any state before IN_TRANSIT → CANCELLED
```
- Every transition writes a `status_history` sub-document — no exceptions
- Invalid transitions return HTTP 400

### Products
- `min_kg` varies per product — NEVER use a global default
- Minimum kg enforced BOTH client-side AND in checkout API
- `PERISHABLE` products need `delivery_days` sub-collection configured before going live
- Server validates delivery date against cutoff on EVERY checkout request

---

## Code Standards

### TypeScript
- Strict TypeScript throughout — no `any` unless absolutely unavoidable
- All Firestore document shapes must have a corresponding interface in `types/`
- Zod schemas validate ALL API inputs — never trust raw request bodies

### File Naming
- Components: PascalCase (`OrderCard.tsx`)
- Utilities/hooks: camelCase (`useCart.ts`, `formatCurrency.ts`)
- API routes: kebab-case folders (`delivery-days/route.ts`)
- Skills: kebab-case (`01-database-schema.md`)

### API Responses
Always use this envelope:
```typescript
{ success: boolean, data?: any, error?: string, message?: string }
```

### Notifications
- Wrap ALL notification calls in `try/catch`
- Notifications must NEVER crash order processing
- `triggerOrderNotifications()` is the ONLY entry point — call it after every status transition

---

## Three Revenue Streams

| Stream | Description | Field |
|---|---|---|
| Product markup | Built into `price_per_kg` | Implicit in subtotal |
| Delivery spread | `customer_delivery_fee − logistics_cost` | `delivery_spread` |
| Service charge | ₦500–₦1,000 flat per order | `service_charge` (ring-fenced) |

---

## Phase Context

- **Phase 1 (NOW):** Logistics via Gokada, Uber Direct, Bolt, Glovo
- **Phase 2 (FUTURE):** Own motorcycle fleet — `OwnFleetProvider` plug-in point exists in `lib/logistics/providers/`
- Do NOT build Phase 2 features now unless explicitly instructed

---

## Skills Reference (load when relevant)
```
01-database-schema     → Firestore collections, TypeScript types, security rules
02-auth-security       → Auth flows, middleware, role guards, Zod validation
03-product-management  → Products, kg selector, perishable config, stock
04-cart-and-checkout   → Cart store, checkout API, order summary
05-delivery-scheduling → Date picker, cutoff enforcement, server validator
06-payment-integration → Paystack, webhooks, revenue records
07-logistics-integration → Courier APIs, dispatch factory, failover
08-order-management    → Order lifecycle, timeline, admin actions
09-admin-panel         → Dashboard, metrics, reports, data tables
10-notifications       → SMS (Termii), email (Resend), templates
11-delivery-zones      → Zone CRUD, address autocomplete, zone detection
12-pricing-revenue-logic → Fee calculator, ring-fence, pricing config
```

---

## What to Do Before Writing ANY Code
1. Re-read the relevant section(s) of this file
2. Load the relevant skill(s) from `.agent/skills/`
3. Check if AGENT.md has a deeper spec for what you're building
4. Confirm money values are in kobo before proceeding

---

*Workspace rules v1.0.0 | CrispRun Food Delivery Platform*
