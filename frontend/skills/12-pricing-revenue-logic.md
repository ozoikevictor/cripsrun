# Skill 12 — Pricing & Revenue Logic

> Use this skill when: calculating order totals, configuring fees, implementing the
> delivery spread model, enforcing the service charge ring-fence, or building the
> admin pricing config page.

---

## Revenue Model Recap

| Stream | Formula | Storage |
|---|---|---|
| Product markup | Built into `price_per_kg` | Implicit in `subtotal` |
| Delivery spread | `customer_delivery_fee − logistics_cost` | `delivery_spread` (kobo) |
| Service charge | Flat ₦500–₦1,000 per order | `service_charge` (kobo) — ring-fenced |

**Ring-fence rule:** `service_charge` flows into `revenue_records.ring_fenced_amount`
and is tracked separately from operating revenue. It is only ever released for Phase 2 fleet investment.

---

## Pricing Calculator

### `lib/pricing/calculator.ts`
```typescript
import { db } from '@/lib/firebase/admin';

interface PricingInput {
  subtotal: number;           // kobo — sum of all line totals
  zone: {
    customer_delivery_fee: number;    // kobo
    base_logistics_cost: number;      // kobo — INTERNAL
    service_charge: number;           // kobo — zone-specific service charge
    delivery_spread?: number;         // kobo — pre-calculated or computed below
  };
}

export interface OrderPricing {
  subtotal: number;
  delivery_fee: number;           // = zone.customer_delivery_fee
  logistics_cost: number;         // = zone.base_logistics_cost — INTERNAL ONLY
  delivery_spread: number;        // = delivery_fee - logistics_cost
  service_charge: number;         // = zone.service_charge — ring-fenced
  total_amount: number;           // = subtotal + delivery_fee + service_charge
}

/**
 * Calculate all pricing fields for an order.
 * All values in kobo (integers only).
 *
 * RULE: logistics_cost and delivery_spread are INTERNAL.
 *       They are stored on the order but NEVER exposed to the customer via API.
 */
export function calculateOrderPricing(input: PricingInput): OrderPricing {
  const { subtotal, zone } = input;

  const delivery_fee = zone.customer_delivery_fee;
  const logistics_cost = zone.base_logistics_cost;
  const delivery_spread = delivery_fee - logistics_cost;
  const service_charge = zone.service_charge;
  const total_amount = subtotal + delivery_fee + service_charge;

  // Validate: spread must never be negative
  if (delivery_spread < 0) {
    throw new Error(
      `PRICING ERROR: Negative delivery spread for zone. ` +
      `Fee: ₦${delivery_fee/100}, Cost: ₦${logistics_cost/100}. ` +
      `Admin must fix zone pricing.`
    );
  }

  return {
    subtotal,
    delivery_fee,
    logistics_cost,
    delivery_spread,
    service_charge,
    total_amount,
  };
}

/**
 * Get current platform pricing config from Firestore.
 * Admins can update service charge range and default spread in /config/pricing.
 */
export async function getPricingConfig(): Promise<{
  min_service_charge: number;     // kobo
  max_service_charge: number;     // kobo
  default_service_charge: number; // kobo
  default_delivery_spread: number; // kobo
}> {
  const snap = await db.collection('config').doc('pricing').get();
  const data = snap.data();

  // Fallback to env defaults if config not yet set
  return {
    min_service_charge: data?.min_service_charge ?? 50000,      // ₦500
    max_service_charge: data?.max_service_charge ?? 100000,     // ₦1,000
    default_service_charge: data?.default_service_charge ?? 75000, // ₦750
    default_delivery_spread: data?.default_delivery_spread ?? 50000, // ₦500
  };
}
```

---

## Pricing Config Document (Firestore)

```typescript
// config/pricing document — managed via admin panel
// Seed this on first deploy:
{
  min_service_charge: 50000,        // ₦500 in kobo
  max_service_charge: 100000,       // ₦1,000 in kobo
  default_service_charge: 75000,    // ₦750 default
  default_delivery_spread: 50000,   // ₦500 default spread
  competitor_reference: {
    delivery_fee: 280000,           // ₦2,800 observed competitor fee
    service_charge: 100000,         // ₦1,000 observed competitor service charge
    note: 'Competitor observed Q1 2025 Lagos market'
  },
  updated_at: Timestamp,
  updated_by: 'admin_uid',
}
```

---

## Admin Pricing Config API

### `app/api/admin/pricing/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { z } from 'zod';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const PricingConfigSchema = z.object({
  min_service_charge: z.number().int().min(50000).max(100000), // ₦500–₦1,000
  max_service_charge: z.number().int().min(50000).max(200000),
  default_service_charge: z.number().int().min(50000).max(200000),
  default_delivery_spread: z.number().int().min(10000),         // Min ₦100 spread
}).refine(
  d => d.default_service_charge >= d.min_service_charge &&
       d.default_service_charge <= d.max_service_charge,
  { message: 'Default service charge must be within min/max range' }
);

export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = PricingConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({
      success: false, error: 'Validation failed', details: parsed.error.flatten()
    }, { status: 422 });
  }

  await db.collection('config').doc('pricing').set({
    ...parsed.data,
    updated_at: FieldValue.serverTimestamp(),
    updated_by: user.uid,
  }, { merge: true });

  return NextResponse.json({ success: true, message: 'Pricing config updated' });
}

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const snap = await db.collection('config').doc('pricing').get();
  return NextResponse.json({ success: true, data: snap.data() });
}
```

---

## Ring-Fence Integrity Check (Scheduled Job)

### `functions/src/scheduled/ring-fence-check.ts`
```typescript
import * as functions from 'firebase-functions/v2/scheduler';
import { db } from '../firebase-admin';
import { sendEmail } from '../notifications/resend';

/**
 * Runs daily at midnight.
 * Verifies that every paid order has a corresponding revenue_record.
 * If any are missing, alerts the admin — these may indicate missed ring-fencing.
 */
export const dailyRingFenceCheck = functions.onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Africa/Lagos' },
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find paid orders without revenue records
    const paidOrders = await db.collection('orders')
      .where('payment_status', '==', 'SUCCESS')
      .where('paid_at', '>=', yesterday)
      .where('paid_at', '<', today)
      .get();

    const missing = [];

    for (const orderDoc of paidOrders.docs) {
      const revenueSnap = await db.collection('revenue_records')
        .doc(orderDoc.id).get();

      if (!revenueSnap.exists) {
        missing.push(orderDoc.data().order_number);
        // Auto-repair: write the missing revenue record
        const order = orderDoc.data();
        await db.collection('revenue_records').doc(orderDoc.id).set({
          id: orderDoc.id,
          order_id: orderDoc.id,
          order_number: order.order_number,
          user_id: order.user_id,
          subtotal: order.subtotal,
          delivery_spread: order.delivery_spread,
          service_charge: order.service_charge,
          ring_fenced_amount: order.service_charge,
          total_platform_revenue: order.delivery_spread + order.service_charge,
          zone_id: order.zone_id,
          logistics_provider: order.logistics_provider ?? 'unknown',
          recorded_at: new Date(),
          auto_repaired: true,
        });
      }
    }

    if (missing.length > 0) {
      console.error(`[RingFence] Missing revenue records detected and repaired: ${missing.join(', ')}`);
      // Send admin alert email
      // sendEmail({ to: ADMIN_EMAIL, subject: 'Revenue Record Alert', ... });
    }

    console.log(`[RingFence] Daily check complete. ${missing.length} records repaired.`);
  }
);
```

---

## Admin Pricing Config Page UI

### `app/(admin)/pricing/page.tsx` — UI requirements
```typescript
// This page should display:

const PRICING_PAGE_SECTIONS = [
  {
    title: 'Service Charge Configuration',
    fields: [
      { label: 'Minimum Service Charge', field: 'min_service_charge', type: 'currency' },
      { label: 'Maximum Service Charge', field: 'max_service_charge', type: 'currency' },
      { label: 'Default Service Charge', field: 'default_service_charge', type: 'currency' },
    ],
    note: 'Service charges are ring-fenced for the Phase 2 fleet fund. Cannot be used for operations.',
  },
  {
    title: 'Delivery Spread Default',
    fields: [
      { label: 'Default Spread', field: 'default_delivery_spread', type: 'currency' },
    ],
    note: 'Individual zone spreads override this default. Update per-zone under Zones.',
  },
  {
    title: 'Competitor Benchmark',
    readOnly: true,
    display: [
      { label: 'Competitor Delivery Fee', value: '₦2,800' },
      { label: 'Competitor Service Charge', value: '₦1,000' },
      { label: 'Competitor Total Add-ons', value: '₦3,800' },
    ],
  },
  {
    title: 'Ring-Fence Fund Summary',
    readOnly: true,
    description: 'All-time accumulated service charges earmarked for Phase 2 fleet.',
    // Fetch from revenue_records aggregation
  },
];
```

---

## Fee Transparency UI (Customer Checkout)

The customer-facing order summary must display fees clearly but NEVER reveal the spread:

```typescript
// Customer sees:
{
  "Subtotal":           "₦5,500",
  "Delivery fee":       "₦3,000",    // = zone.customer_delivery_fee
  "Service charge":     "₦750",      // = zone.service_charge
  "Total":              "₦9,250",
}

// Customer NEVER sees:
// logistics_cost: ₦2,500
// delivery_spread: ₦500

// Tooltip on service charge (optional UX copy):
// "A platform service fee that helps us maintain and improve CrispRun."
```
