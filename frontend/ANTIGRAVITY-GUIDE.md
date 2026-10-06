# CrispRun × Google AntiGravity
## Complete Step-by-Step Vibe Coding Guide

> **How to read this guide:**
> Do every step in order. Do not skip ahead.
> Steps marked 🔴 are mandatory. Steps marked 🟡 are recommended.

---

## PART 1 — Install & First Launch

### Step 1 🔴 — Download AntiGravity
1. Go to **antigravityide.org** (or search "Google AntiGravity IDE download")
2. Download the installer for your OS (Windows / macOS / Linux)
3. Run the installer — accept all defaults
4. Launch AntiGravity

### Step 2 🔴 — Configure the Agent Manager
On first launch you will see the **Agent Manager configuration screen**.

Under **Development Mode**, select:
> ✅ **Agent-assisted development** ← Choose this
> (You stay in control; AI helps with safe automations.
> NOT "Agent-driven" / autopilot — that skips your review.)

Under **Terminal Policy**, set:
> ✅ **Auto** — lets the agent run standard commands (npm install, etc.)
> without asking permission every time.

Under **Agent Decides**, leave on default.

Click **Next** → sign in with your Google account → accept security terms.

### Step 3 🔴 — Connect Firebase
When prompted to link a project:
- Click **"Create new Firebase project"**
- Name it: `crisprun-prod` (or your chosen brand name)
- Tick **Firestore, Authentication, Storage, Cloud Functions**
- Click **Connect**

> AntiGravity will auto-scaffold the Firebase config. This is a built-in integration — let it do it.

---

## PART 2 — Create the Project & Place Files

### Step 4 🔴 — Open the Project Folder
1. In AntiGravity's **Projects panel** (left sidebar), click **"Open Folder"**
2. Create a new empty folder on your computer called `crisprun`
3. Open that folder in AntiGravity

### Step 5 🔴 — Create the Exact Folder Structure
In AntiGravity's terminal panel, run these commands one by one:

```bash
# Create all required directories
mkdir -p .agent/skills/01-database-schema/references
mkdir -p .agent/skills/02-auth-security/references
mkdir -p .agent/skills/03-product-management/references
mkdir -p .agent/skills/04-cart-and-checkout/references
mkdir -p .agent/skills/05-delivery-scheduling/references
mkdir -p .agent/skills/06-payment-integration/references
mkdir -p .agent/skills/07-logistics-integration/references
mkdir -p .agent/skills/08-order-management/references
mkdir -p .agent/skills/09-admin-panel/references
mkdir -p .agent/skills/10-notifications/references
mkdir -p .agent/skills/11-delivery-zones/references
mkdir -p .agent/skills/12-pricing-revenue-logic/references
mkdir -p .agent/workflows
```

### Step 6 🔴 — Place GEMINI.md (Master Context)
Create a file called **`GEMINI.md`** in the **project root** (`crisprun/`).

Copy the **entire contents of `AGENT.md`** (from your downloaded files) into it.

> ⚠️ Rename it from `AGENT.md` to `GEMINI.md`. This is the filename
> AntiGravity automatically loads as workspace-level rules.
> The content is identical — just the filename changes.

### Step 7 🔴 — Convert Skills to AntiGravity Format
Each of your 12 skills needs to be reformatted with a **YAML header** that
AntiGravity uses to decide when to load it.

For each skill, create a `SKILL.md` inside its folder following this pattern:

**Example: `.agent/skills/01-database-schema/SKILL.md`**
```markdown
---
name: "CrispRun Database Schema"
description: |
  Use this skill when the task involves defining, querying, or updating
  Firestore collections: users, products, orders, delivery_zones, 
  revenue_records, or config. Also use when setting up TypeScript interfaces,
  Firestore security rules, composite indexes, or Firebase Admin SDK.
version: "1.0.0"
author: "CrispRun Team"
---

[paste the FULL contents of skills/01-database-schema.md here]
```

**Repeat this for all 12 skills.** Use these exact descriptions in the YAML header:

```yaml
# Skill 01
description: |
  Use when defining Firestore collections, TypeScript data interfaces, 
  security rules, composite indexes, or Firebase Admin/Client SDK setup.

# Skill 02
description: |
  Use when building authentication flows, middleware, role guards, 
  API route protection, Zod validation, rate limiting, or security headers.

# Skill 03
description: |
  Use when creating or editing products, the kg selector, product catalog,
  category management, stock levels, or perishable delivery day configuration.

# Skill 04
description: |
  Use when building the cart, checkout flow, order summary, mixed delivery
  date logic, or the Zustand cart store.

# Skill 05
description: |
  Use when implementing delivery date selection, cutoff time enforcement,
  perishable scheduling constraints, or the date picker component.

# Skill 06
description: |
  Use when integrating Paystack, handling payment webhooks, verifying
  transactions, writing revenue records, or processing refunds.

# Skill 07
description: |
  Use when integrating Gokada, Uber Direct, Bolt, or Glovo logistics APIs,
  building the logistics factory, dispatch endpoint, or the Phase 2 fleet hook.

# Skill 08
description: |
  Use when building order history, order detail page, order timeline,
  admin order management, status transitions, or repeat order feature.

# Skill 09
description: |
  Use when building the admin dashboard, metric cards, revenue charts, 
  low-stock alerts, data tables, or the revenue report page.

# Skill 10
description: |
  Use when triggering notifications, building SMS templates via Termii,
  email templates via Resend, or the inline HTML email renderer.

# Skill 11
description: |
  Use when building delivery zones, address autocomplete with Google Places,
  zone detection from coordinates or LGA, or the zone management admin page.

# Skill 12
description: |
  Use when calculating order totals, configuring service charges, delivery
  spread, ring-fencing logic, or the admin pricing configuration page.
```

### Step 8 🟡 — Create Workflows (Slash Commands)
Create these 5 files in `.agent/workflows/`:

**`.agent/workflows/build-feature.md`**
```markdown
---
name: Build Feature
description: Standard workflow for building any new CrispRun feature
command: build-feature
---

When triggered, follow this sequence:
1. Read GEMINI.md fully before writing any code
2. Identify which skill(s) from .agent/skills/ apply to this task
3. Follow the skill instructions exactly — do not deviate from the patterns shown
4. All monetary values must be in kobo (integers). Never use floats for money.
5. All admin routes must include: `if (!user || user.role !== 'admin') return 403`
6. Write the code, then run the dev server and verify in browser
7. Report what was built with a screenshot artifact
```

**`.agent/workflows/add-product.md`**
```markdown
---
name: Add Product Type
description: Add a new product or category to the catalog
command: add-product
---

1. Read skill 03-product-management
2. Determine: is this REGULAR or PERISHABLE?
3. If PERISHABLE, prompt me for delivery_days and cutoff_hours before proceeding
4. Add the product to Firestore with all required fields
5. Confirm min_kg, max_kg, kg_increment are explicitly set (do not use defaults)
6. Update the admin product form if a new field type is needed
```

**`.agent/workflows/new-order-status.md`**
```markdown
---
name: Order Status Update
description: Update or add a step in the order lifecycle state machine
command: new-order-status
---

1. Read skill 08-order-management
2. Check GEMINI.md Section 8 (Order Lifecycle) — confirm the transition is valid
3. Update transitionOrderStatus() valid transitions map
4. Update OrderTimeline component to reflect the new status
5. Update NOTIFIABLE_STATUSES in notifications/templates.ts if customer should be notified
6. Write a status_history entry — never skip this
```

**`.agent/workflows/deploy-check.md`**
```markdown
---
name: Pre-Deploy Security Check
description: Run before every deployment to production
command: deploy-check
---

Check every item. Stop and flag if any fail:
1. [ ] No secret keys in client bundle — run: grep -r "sk_" ./app ./components ./hooks
2. [ ] logistics_cost and delivery_spread never appear in /api/zones/detect response
3. [ ] Paystack webhook verifyPaystackSignature() is called before any processing
4. [ ] All admin API routes check role === 'admin'
5. [ ] Firestore security rules deployed: firebase deploy --only firestore:rules
6. [ ] .env.local is in .gitignore
7. [ ] All kobo values are integers — no decimal prices
8. [ ] Revenue record is written for every PAYMENT_CONFIRMED order
```

**`.agent/workflows/ring-fence-check.md`**
```markdown
---
name: Ring-Fence Audit
description: Verify ring-fenced service charge integrity
command: ring-fence-check
---

1. Read skill 12-pricing-revenue-logic
2. Query revenue_records collection: count documents where ring_fenced_amount != service_charge
3. Query orders where payment_status = SUCCESS: verify matching revenue_records exist
4. Report: total ring_fenced_amount accumulated to date (all-time)
5. Report: any orders missing a revenue_record (these are integrity failures)
6. If any missing: run the auto-repair logic from the dailyRingFenceCheck Cloud Function
```

---

## PART 3 — Initialize the Next.js Project

### Step 9 🔴 — Scaffold the App
In the AntiGravity **Inbox panel**, click **"Start Conversation"** → select your project workspace. Type this as your very first prompt:

```
Read GEMINI.md completely before responding.

Initialize a Next.js 14 project with TypeScript using the App Router.
Install and configure:
- Tailwind CSS
- shadcn/ui (run the init command)
- Firebase SDK (client + admin)
- Zustand
- Zod
- @tanstack/react-table
- date-fns
- lucide-react
- paystack (npm package)

Create the folder structure exactly as defined in GEMINI.md Section 6.

Create the Firebase client and admin initialization files at:
- lib/firebase/client.ts
- lib/firebase/admin.ts

Use the environment variable names exactly as listed in GEMINI.md Section 12.
Create a .env.local.example file with all variable names but empty values.
Add .env.local to .gitignore immediately.

Do not write any feature code yet. Scaffolding only.
```

Wait for the agent to finish. Review the file tree artifact it produces.
Confirm the folder structure matches Section 6 of GEMINI.md before continuing.

### Step 10 🔴 — Seed Firestore Config Documents
Open a new Inbox conversation. Type:

```
Read GEMINI.md and skill 12-pricing-revenue-logic.

Using the Firebase Admin SDK, create a one-time seed script at
scripts/seed-firestore-config.ts that writes these Firestore documents:

1. config/pricing — with these values:
   min_service_charge: 50000
   max_service_charge: 100000
   default_service_charge: 75000
   default_delivery_spread: 50000
   competitor_reference: { delivery_fee: 280000, service_charge: 100000 }

2. config/logistics — with these values:
   active_providers: ["gokada", "uber_direct"]
   default_provider: "gokada"
   fallback_enabled: true
   phase: 1
   store_address: { full_address: "[YOUR STORE ADDRESS]", lat: 0, lng: 0, phone: "" }

3. config/platform — with these values:
   maintenance_mode: false
   app_name: "CrispRun"
   support_phone: ""

Then run the seed script once via ts-node.
```

---

## PART 4 — Build Order (Feature by Feature)

Build in this exact sequence. Each step is a **separate Inbox conversation**.
Do NOT mix multiple features into one conversation.

---

### Step 11 🔴 — Deploy Firestore Security Rules
```
Read GEMINI.md and skill 01-database-schema.

Copy the Firestore security rules from skill 01 exactly into firestore.rules.
Copy the composite indexes from skill 01 into firestore.indexes.json.
Then run: firebase deploy --only firestore:rules,firestore:indexes

Confirm deployment succeeded before closing this task.
```

---

### Step 12 🔴 — Authentication System
```
Read GEMINI.md and skill 02-auth-security.

Build the complete authentication system:
1. middleware.ts at the project root — use the exact code from skill 02
2. lib/auth/server.ts — getTokenFromRequest(), verifyToken(), getUserFromRequest()
3. lib/auth/rate-limit.ts — rate limiting utility
4. lib/env.ts — environment variable validation with Zod
5. next.config.js — security headers as defined in skill 02
6. app/(auth)/login/page.tsx — email/password login form
7. app/(auth)/register/page.tsx — registration form (email, phone, full_name, password)

The register flow must write a user document to Firestore on successful signup.
Phone field must be stored in E.164 format.
Role must always be set to "customer" on registration — never allow client to set role.

Test: register a new account, confirm Firestore user document is created.
```

---

### Step 13 🔴 — Product Catalog (The Core)
```
Read GEMINI.md and skill 03-product-management.

Build the product system:
1. types/product.types.ts — all interfaces from skill 01
2. lib/validators/product.schema.ts — Zod schemas from skill 02
3. lib/firestore/products.ts — all helper functions from skill 01
4. lib/utils/format.ts — formatCurrency(), formatKg(), calcLineTotal()
5. components/catalog/KgSelector.tsx — the weight selector component
6. components/catalog/ProductCard.tsx — product listing card
7. app/(customer)/catalog/page.tsx — full product listing page with category filter
8. app/(customer)/product/[slug]/page.tsx — product detail page
9. app/api/admin/products/route.ts — POST create, GET list (admin only)
10. app/api/admin/products/[id]/route.ts — GET, PUT, DELETE (soft delete only)
11. app/api/admin/products/[id]/delivery-days/route.ts — PUT for perishable config

CRITICAL RULES:
- price_per_kg stored in KOBO (integer). The form takes Naira input — multiply by 100 before saving.
- min_kg varies per product. Do NOT use a global default.
- Soft delete only: set is_active: false, never delete Firestore documents.
- Delivery days endpoint must reject if product_type is not PERISHABLE.

Test: create one REGULAR product and one PERISHABLE product via the admin API.
```

---

### Step 14 🔴 — Delivery Zones
```
Read GEMINI.md and skill 11-delivery-zones.

Build the delivery zone system:
1. types/zone.types.ts
2. lib/zones/detector.ts — zone detection by LGA, area, then distance fallback
3. app/api/admin/zones/route.ts — POST create zone, GET list (admin: full data, public: no logistics_cost)
4. app/api/admin/zones/[id]/route.ts — GET, PUT, DELETE
5. app/api/zones/detect/route.ts — PUBLIC endpoint for zone detection at checkout
   CRITICAL: This endpoint must NEVER return base_logistics_cost or delivery_spread

Create a seed function that creates one test zone:
  name: "Ikorodu"
  lgas: ["Ikorodu"]
  customer_delivery_fee: 300000  (₦3,000 in kobo)
  base_logistics_cost: 250000    (₦2,500 in kobo — INTERNAL)
  service_charge: 75000          (₦750 in kobo)
  estimated_delivery_minutes: 60
  is_active: true

Test the detect endpoint — confirm logistics_cost is NOT in the response.
```

---

### Step 15 🔴 — Cart & Checkout
```
Read GEMINI.md and skill 04-cart-and-checkout.

Build:
1. store/cart.store.ts — Zustand cart with persist middleware
2. hooks/useCart.ts — wrapper hook
3. components/cart/CartDrawer.tsx — slide-out cart panel
4. components/cart/CartItem.tsx — item row with KgSelector for quantity updates
5. app/(customer)/cart/page.tsx — full cart page
6. lib/validators/order.schema.ts — Zod checkout schema from skill 02
7. app/api/checkout/route.ts — full checkout API

The checkout API must:
- Validate every product's min_kg server-side (not just client)
- Check stock availability before creating the order
- Calculate pricing using calculateOrderPricing() from skill 12
- Initialize a Paystack transaction
- Return payment_url and access_code (never expose logistics_cost)
- Return 400 with helpful error message for any validation failure
```

---

### Step 16 🔴 — Delivery Scheduling
```
Read GEMINI.md and skill 05-delivery-scheduling.

Build:
1. lib/scheduling/validator.ts — server-side validateDeliveryDate()
2. hooks/useDeliveryDates.ts — client-side date logic hook
3. components/checkout/DeliveryDatePicker.tsx — date picker with perishable constraints
4. components/checkout/AddressInput.tsx — Google Places autocomplete (from skill 11)

The date picker must:
- Disable past dates and today (minimum 24h lead time)
- For REGULAR-only carts: allow any future date
- For PERISHABLE items: only show days in the intersection of all perishable delivery_days
- For MIXED carts: present the choice between SINGLE or SPLIT delivery
- Show a clear, user-friendly label for allowed days

The server validator (validateDeliveryDate) must also enforce cutoff_hours.
An order placed after cutoff must return 400 with the cutoff time in the error message.
```

---

### Step 17 🔴 — Payment Integration
```
Read GEMINI.md and skill 06-payment-integration.

Build:
1. lib/paystack/client.ts — initializePaystackTransaction(), verifyPaystackTransaction(), refundPaystackTransaction()
2. lib/pricing/calculator.ts — calculateOrderPricing() from skill 12
3. lib/firestore/revenue.ts — writeRevenueRecord()
4. app/api/payments/webhook/route.ts — Paystack webhook handler

CRITICAL for webhook:
- verifyPaystackSignature() MUST run before any order processing
- Check amount matches order.total_amount — reject if mismatched
- Check idempotency: if payment_status is already SUCCESS, return 200 and skip
- Write revenue_record ATOMICALLY with order status update (use Firestore batch)
- Transition order status to PAYMENT_CONFIRMED after successful payment

5. app/api/payments/verify/[reference]/route.ts — polling fallback
6. components/checkout/PaystackButton.tsx — inline payment widget

Add PAYSTACK_WEBHOOK_SECRET to .env.local.example
```

---

### Step 18 🔴 — Notifications
```
Read GEMINI.md and skill 10-notifications.

Build:
1. lib/notifications/termii.ts — SMS client with phone normalizer
2. lib/notifications/email-renderer.ts — inline HTML email generator
3. lib/notifications/resend.ts — Resend email client
4. lib/notifications/templates.ts — SMS + email templates for all order statuses
5. lib/notifications/index.ts — triggerOrderNotifications() main dispatcher

Wire triggerOrderNotifications() into:
- Paystack webhook handler (on PAYMENT_CONFIRMED)
- transitionOrderStatus() in lib/firestore/orders.ts (on every status change)

Notifications must NEVER throw and crash the order processing flow.
Wrap all notification calls in try/catch.
```

---

### Step 19 🔴 — Order Management
```
Read GEMINI.md and skill 08-order-management.

Build:
1. lib/firestore/orders.ts — createOrder(), transitionOrderStatus(), generateOrderNumber()
2. types/order.types.ts — all order interfaces
3. components/orders/OrderCard.tsx — order summary card
4. components/orders/OrderTimeline.tsx — status timeline component
5. app/(customer)/orders/page.tsx — order history
6. app/(customer)/orders/[orderId]/page.tsx — order detail with timeline
7. app/api/orders/[id]/cancel/route.ts — customer cancel (before PROCESSING only)

Order number format: CR-YYYYMMDD-XXXX (see generateOrderNumber() in skill 08)
Status transitions must follow the state machine in GEMINI.md Section 8 exactly.
Every status change must write a status_history sub-document.
```

---

### Step 20 🔴 — Logistics Integration
```
Read GEMINI.md and skill 07-logistics-integration.

Build:
1. lib/logistics/types.ts — ILogisticsProvider interface and all shared types
2. lib/logistics/providers/gokada.ts — Gokada provider
3. lib/logistics/providers/uber-direct.ts — Uber Direct provider with OAuth token caching
4. lib/logistics/providers/stub-providers.ts — Bolt and Glovo stubs
5. lib/logistics/factory.ts — getLogisticsProvider() and dispatchWithFailover()
6. app/api/admin/orders/[id]/dispatch/route.ts — admin dispatch endpoint
7. app/api/admin/orders/[id]/status/route.ts — admin manual status update

The dispatch endpoint reads logistics config from config/logistics Firestore doc.
On dispatch failure: try the fallback provider (use dispatchWithFailover).
Log both the attempted provider and the result.

NOTE: Gokada and Uber Direct API URLs in skill 07 are placeholders.
Update them when you receive actual API credentials from each provider.
```

---

### Step 21 🔴 — Admin Panel
```
Read GEMINI.md and skill 09-admin-panel.

Build:
1. app/(admin)/layout.tsx — admin layout with sidebar + role guard
2. components/admin/AdminSidebar.tsx — navigation with all menu items
3. components/admin/MetricCard.tsx — KPI display component
4. components/admin/DataTable.tsx — reusable sortable/paginated table
5. components/admin/LowStockAlert.tsx — stock warning component
6. lib/admin/metrics.ts — getDashboardMetrics() function
7. app/(admin)/dashboard/page.tsx — main dashboard
8. app/(admin)/orders/page.tsx — order management list
9. app/(admin)/orders/[id]/page.tsx — order detail with dispatch button
10. app/(admin)/products/page.tsx — product management list
11. app/(admin)/products/new/page.tsx — create product form
12. app/(admin)/zones/page.tsx — zone management
13. app/(admin)/reports/page.tsx — revenue report with ring-fence summary
14. app/(admin)/pricing/page.tsx — service charge + spread configuration
15. app/(admin)/logistics/page.tsx — logistics provider priority config

Every admin page must redirect to /login if session.role !== 'admin'.
The revenue report page must clearly label and separate ring-fenced amounts.
```

---

### Step 22 🔴 — Cloud Functions (Background Jobs)
```
Read GEMINI.md and skills 06 and 12.

In the functions/ directory, build:
1. functions/src/payments/on-payment-confirmed.ts
   - Triggered by Paystack webhook (already in Step 17)
   - Decrements product stock after payment
   - Use Firestore batch for atomicity

2. functions/src/scheduled/ring-fence-check.ts
   - Runs daily at midnight Lagos time (Africa/Lagos)
   - Finds paid orders missing a revenue_record
   - Auto-creates missing records
   - Logs a warning for each repaired record

3. functions/src/scheduled/low-stock-alert.ts
   - Runs daily at 8am Lagos time
   - Finds products where stock_kg <= low_stock_threshold
   - Sends admin email notification listing all low-stock products

Deploy functions: firebase deploy --only functions
```

---

## PART 5 — Prompting Tips

### How to Write Good AntiGravity Prompts

**✅ DO:**
```
# Good — specific, references context, has clear success criteria
Read GEMINI.md Section 7 and skill 03-product-management.

Add a `tags` field to the product catalog filter bar.
Tags are stored as string[] on the ProductDocument.
The filter should show all unique tags from active products.
Selecting a tag filters the product grid client-side (no new API call needed).

Test: add tags ["protein", "seafood"] to a test product and verify the filter works.
```

**❌ DON'T:**
```
# Bad — vague, no context reference, no test criteria
add tag filtering to the products page
```

---

**✅ DO — inline corrections (AntiGravity Google-doc style):**
When the agent produces a plan or code artifact, highlight the part you want changed and type:
```
Use Zod here instead of manual validation
```
or:
```
This delivery fee calculation is wrong — customer_delivery_fee should come from
the zone document, not be hardcoded. Fix per skill 12.
```

**❌ DON'T** restart the entire conversation to fix one thing.

---

### The 5-Part Prompt Template
Use this structure for every non-trivial task:

```
1. CONTEXT:   "Read GEMINI.md [Section X] and skill [NN-name]."
2. TASK:      "Build / Fix / Update [specific thing]."
3. RULES:     "Must follow these constraints: [list critical rules]."
4. OUTPUT:    "Produce: [list files to create/modify]."
5. VERIFY:    "Test by: [how to confirm it works]."
```

---

### When the Agent Drifts
If the agent starts making decisions that contradict GEMINI.md, stop it immediately with:

```
Stop. Re-read GEMINI.md Section [N].
You are violating rule: [quote the rule].
Revert [the specific file] and redo with the correct approach.
```

---

### Handling "Working..." Stalls
If the agent gets stuck:
1. Open a new Inbox conversation
2. Start with: `"Read GEMINI.md. The previous task was: [describe it]. Here is what was built so far: [paste file names]. Continue from: [where it stopped]."`

---

## PART 6 — Deployment

### Step 23 🔴 — Run Pre-Deploy Check
In a new Inbox conversation:
```
/deploy-check
```
Fix every flagged item before continuing.

### Step 24 🔴 — Deploy to Production

```
Read GEMINI.md Section 11 (Deployment).

Deploy the application using this stack:
- Frontend + API routes: Vercel
  Run: vercel --prod
  Set all environment variables from .env.local.example in Vercel dashboard

- Firebase services: Firebase CLI
  Run: firebase deploy

- Domain: Connect custom domain in Vercel dashboard
  Enable HSTS enforcement

After deployment:
1. Test the full order flow end-to-end: browse → add to cart → checkout → pay → track
2. Trigger a test Paystack webhook and confirm revenue_record is written
3. Confirm logistics_cost does NOT appear in any customer-facing API response
4. Check admin dashboard loads correctly
5. Confirm DELIVERED status sends SMS and email
```

### Step 25 🟡 — Enable Firebase App Check
```
In the Firebase console:
1. Go to App Check → Register your app
2. Choose reCAPTCHA v3 for web
3. Enable enforcement for Firestore and Storage

This blocks traffic that doesn't come from your actual app.
```

---

## PART 7 — Quick Reference Card

Keep this handy during development:

```
MONEY:          Always kobo (integer). ₦1 = 100 kobo.
DELETE:         NEVER hard-delete. Set is_active: false.
SECRETS:        logistics_cost and delivery_spread → NEVER in customer API response.
RING-FENCE:     service_charge → ALWAYS write revenue_record. ALWAYS.
WEBHOOK:        verifyPaystackSignature() → MUST run before any processing.
MIN KG:         Enforced BOTH client-side AND in checkout API.
PERISHABLE:     Server-side validateDeliveryDate() runs on EVERY checkout.
STATE MACHINE:  Invalid order transitions → return 400. Never skip history entry.
ADMIN:          Every admin route: if (!user || user.role !== 'admin') return 403.
```

---

## PART 8 — Replace Brand Name

When you have a confirmed brand name:
1. Find-and-replace `CrispRun` across the entire codebase
2. Update `GEMINI.md` line 1
3. Update `TERMII_SENDER_ID` in `.env.local`
4. Update `RESEND_FROM_EMAIL` in `.env.local`
5. Update the order number prefix in `generateOrderNumber()` — currently `CR-`

---

*Guide version: 1.0.0*
*For: Google AntiGravity v1.20.5+*
*Project: CrispRun Food Delivery Platform*
