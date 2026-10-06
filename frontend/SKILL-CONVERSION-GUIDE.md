# How to Convert Skills to AntiGravity Format

## The Problem
Our skills are in `skills/01-database-schema.md` format.
AntiGravity expects: `.agent/skills/01-database-schema/SKILL.md`

Each SKILL.md needs a YAML header (the "SEO" AntiGravity uses to decide when to load the skill).

---

## The SKILL.md Template

Every skill file must start with this YAML front matter:

```
---
name: "Skill Name Here"
description: |
  [This is critical — write clear trigger conditions.
   AntiGravity uses semantic search on this to decide when to load the skill.
   Vague descriptions = skill gets ignored.]
version: "1.0.0"
tags: ["crisprun", "tag1", "tag2"]
---

[Full skill content goes here — paste from skills/NN-name.md]
```

---

## All 12 SKILL.md Headers (Ready to Use)

### `.agent/skills/01-database-schema/SKILL.md`
```yaml
---
name: "CrispRun Database Schema"
description: |
  Use when defining or querying Firestore collections: users, products, orders,
  delivery_zones, revenue_records, config. Also use for TypeScript data interfaces,
  Firestore security rules, composite indexes, or Firebase Admin/Client SDK setup.
version: "1.0.0"
tags: ["crisprun", "firestore", "database", "schema", "types"]
---
```

### `.agent/skills/02-auth-security/SKILL.md`
```yaml
---
name: "CrispRun Auth & Security"
description: |
  Use when building authentication flows, Next.js middleware, role guards (admin/customer),
  API route protection, Zod validation schemas, rate limiting, security headers,
  or environment variable validation.
version: "1.0.0"
tags: ["crisprun", "auth", "security", "firebase-auth", "middleware", "zod"]
---
```

### `.agent/skills/03-product-management/SKILL.md`
```yaml
---
name: "CrispRun Product Management"
description: |
  Use when creating or editing products, building the kg weight selector, product catalog
  listing, category management, stock tracking, image upload, or configuring perishable
  product delivery days and cutoff hours.
version: "1.0.0"
tags: ["crisprun", "products", "catalog", "kg-selector", "perishable", "stock"]
---
```

### `.agent/skills/04-cart-and-checkout/SKILL.md`
```yaml
---
name: "CrispRun Cart & Checkout"
description: |
  Use when building the shopping cart, Zustand cart store, checkout multi-step flow,
  order summary component, mixed regular/perishable delivery type logic, or the
  checkout API that creates orders and initializes payment.
version: "1.0.0"
tags: ["crisprun", "cart", "checkout", "zustand", "order-creation"]
---
```

### `.agent/skills/05-delivery-scheduling/SKILL.md`
```yaml
---
name: "CrispRun Delivery Scheduling"
description: |
  Use when implementing delivery date selection, perishable cutoff time enforcement,
  the date picker component with day restrictions, mixed-cart split delivery logic,
  or server-side delivery date validation at checkout.
version: "1.0.0"
tags: ["crisprun", "scheduling", "delivery-date", "perishable", "cutoff"]
---
```

### `.agent/skills/06-payment-integration/SKILL.md`
```yaml
---
name: "CrispRun Paystack Payment Integration"
description: |
  Use when integrating Paystack payment gateway, handling Paystack webhooks,
  verifying transaction signatures (HMAC-SHA512), writing revenue records,
  processing refunds, or building the payment button component.
version: "1.0.0"
tags: ["crisprun", "paystack", "payment", "webhook", "revenue-record"]
---
```

### `.agent/skills/07-logistics-integration/SKILL.md`
```yaml
---
name: "CrispRun Logistics Integration"
description: |
  Use when integrating Gokada, Uber Direct, Bolt Food, or Glovo delivery APIs,
  building the logistics provider abstraction layer, dispatch with failover,
  the admin dispatch endpoint, or preparing the Phase 2 own-fleet plug-in point.
version: "1.0.0"
tags: ["crisprun", "logistics", "gokada", "uber-direct", "dispatch", "courier"]
---
```

### `.agent/skills/08-order-management/SKILL.md`
```yaml
---
name: "CrispRun Order Management"
description: |
  Use when building order history, order detail page, order status timeline component,
  admin order management interface, order state machine transitions, status history
  logging, customer cancel flow, or the repeat order feature.
version: "1.0.0"
tags: ["crisprun", "orders", "order-status", "timeline", "state-machine"]
---
```

### `.agent/skills/09-admin-panel/SKILL.md`
```yaml
---
name: "CrispRun Admin Panel"
description: |
  Use when building the admin dashboard, KPI metric cards, revenue charts,
  low-stock alerts, reusable data tables, the revenue report with ring-fence
  summary, admin navigation layout, or any admin management page.
version: "1.0.0"
tags: ["crisprun", "admin", "dashboard", "metrics", "revenue-report"]
---
```

### `.agent/skills/10-notifications/SKILL.md`
```yaml
---
name: "CrispRun Notifications (SMS + Email)"
description: |
  Use when triggering order status notifications, building SMS message templates
  via Termii, building HTML email templates via Resend, normalizing Nigerian
  phone numbers, or wiring notification triggers into order status changes.
version: "1.0.0"
tags: ["crisprun", "notifications", "sms", "termii", "email", "resend"]
---
```

### `.agent/skills/11-delivery-zones/SKILL.md`
```yaml
---
name: "CrispRun Delivery Zones"
description: |
  Use when building delivery zone CRUD, address autocomplete with Google Places API,
  zone detection from LGA or coordinates, the zone detect API endpoint, or the
  admin zone management page with Lagos LGA configuration.
version: "1.0.0"
tags: ["crisprun", "zones", "delivery-area", "google-places", "lga", "lagos"]
---
```

### `.agent/skills/12-pricing-revenue-logic/SKILL.md`
```yaml
---
name: "CrispRun Pricing & Revenue Logic"
description: |
  Use when calculating order totals, configuring delivery spread, service charges,
  the ring-fence integrity check for fleet fund, the pricing fee calculator,
  admin pricing configuration page, or the revenue breakdown model.
version: "1.0.0"
tags: ["crisprun", "pricing", "revenue", "ring-fence", "service-charge", "kobo"]
---
```

---

## Step-by-Step Conversion

For each of the 12 skills:

1. Open `.agent/skills/[skill-folder]/SKILL.md` (create if not exists)
2. Paste the YAML header from above
3. Below the `---` closing line, paste the FULL content of `skills/[NN-name].md`
4. Save

Example for skill 01:
```
---
name: "CrispRun Database Schema"
description: |
  Use when defining or querying Firestore collections: users, products, orders,
  delivery_zones, revenue_records, config. Also use for TypeScript data interfaces,
  Firestore security rules, composite indexes, or Firebase Admin/Client SDK setup.
version: "1.0.0"
tags: ["crisprun", "firestore", "database", "schema", "types"]
---

# Skill 01 — Firestore Database Schema

> Use this skill when: defining collections, querying Firestore...

[... rest of the skill content ...]
```

That's it. Repeat for all 12.
```

---

## Pro Tip: Description = SEO for AI

The `description` field is how AntiGravity decides whether to load your skill.
It uses semantic search — so write it in natural language, NOT as keywords.

Good:
```yaml
description: |
  Use when building authentication flows, Next.js middleware, or role-based
  access control for admin vs customer users.
```

Bad:
```yaml
description: auth security roles middleware
```

If your skill isn't being used, make the description more specific and conversational.
