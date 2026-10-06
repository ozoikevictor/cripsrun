# Skill 04 — Cart & Checkout

> Use this skill when: building cart state, checkout flow, mixed product delivery logic,
> or the order summary component.

---

## Cart State (Zustand)

### `store/cart.store.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calcLineTotal } from '@/lib/utils/format';

export interface CartItem {
  product_id: string;
  kg_quantity: number;
  product_snapshot: {
    name: string;
    price_per_kg: number;     // kobo
    image_url: string;
    min_kg: number;
    max_kg: number | null;
    kg_increment: number;
    product_type: 'REGULAR' | 'PERISHABLE';
    delivery_days: number[];  // populated for PERISHABLE, [] for REGULAR
  };
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (product_id: string, kg: number) => void;
  removeItem: (product_id: string) => void;
  clearCart: () => void;
  // Computed
  subtotalKobo: () => number;
  itemCount: () => number;
  hasPerishableItems: () => boolean;
  hasRegularItems: () => boolean;
  perishableDeliveryDays: () => number[];  // intersection of all perishable item days
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const existing = get().items.find(i => i.product_id === newItem.product_id);

        if (existing) {
          // Update quantity instead of adding duplicate
          set(state => ({
            items: state.items.map(i =>
              i.product_id === newItem.product_id
                ? { ...i, kg_quantity: Math.min(
                    newItem.kg_quantity,
                    i.product_snapshot.max_kg ?? Infinity
                  )}
                : i
            ),
          }));
        } else {
          set(state => ({ items: [...state.items, newItem] }));
        }
      },

      updateQuantity: (product_id, kg) => {
        set(state => ({
          items: state.items.map(i =>
            i.product_id === product_id ? { ...i, kg_quantity: kg } : i
          ),
        }));
      },

      removeItem: (product_id) => {
        set(state => ({
          items: state.items.filter(i => i.product_id !== product_id),
        }));
      },

      clearCart: () => set({ items: [] }),

      subtotalKobo: () => {
        return get().items.reduce(
          (sum, item) => sum + calcLineTotal(item.product_snapshot.price_per_kg, item.kg_quantity),
          0
        );
      },

      itemCount: () => get().items.length,

      hasPerishableItems: () =>
        get().items.some(i => i.product_snapshot.product_type === 'PERISHABLE'),

      hasRegularItems: () =>
        get().items.some(i => i.product_snapshot.product_type === 'REGULAR'),

      /** Returns the INTERSECTION of delivery days across all perishable items.
       *  If empty array returned: no valid delivery days exist (items are incompatible).
       */
      perishableDeliveryDays: () => {
        const perishable = get().items.filter(
          i => i.product_snapshot.product_type === 'PERISHABLE'
        );
        if (perishable.length === 0) return [0, 1, 2, 3, 4, 5, 6]; // All days for regular

        const firstDays = new Set(perishable[0].product_snapshot.delivery_days);
        for (let i = 1; i < perishable.length; i++) {
          const currentDays = new Set(perishable[i].product_snapshot.delivery_days);
          // Intersection
          for (const day of firstDays) {
            if (!currentDays.has(day)) firstDays.delete(day);
          }
        }

        return Array.from(firstDays).sort();
      },
    }),
    { name: 'crisprun-cart' }
  )
);
```

---

## Checkout Flow (Multi-Step)

### Steps
```
Step 1: Delivery Address
  → Select saved address OR enter new address
  → Google Places Autocomplete for address input
  → Zone detection based on address

Step 2: Delivery Date
  → If ONLY regular items: date picker (any day)
  → If ONLY perishable items: date picker (restricted to allowed days)
  → If MIXED items: 
      Choice A — Split delivery (two dates, two fees)
      Choice B — Single delivery (only perishable-allowed days available)

Step 3: Order Review
  → Item list with kg quantities and subtotals
  → Delivery fee + service charge breakdown
  → Total amount
  → Accept T&Cs

Step 4: Payment
  → Paystack inline payment
  → Redirect on success
```

---

## Delivery Date Logic (Client-Side)

### `hooks/useDeliveryDates.ts`
```typescript
import { useCartStore } from '@/store/cart.store';

interface DeliveryDateConfig {
  canSelectAnyDay: boolean;
  allowedDaysOfWeek: number[];      // 0–6
  earliestDate: Date;
  deliveryType: 'SINGLE' | 'MUST_SPLIT' | 'CAN_SPLIT';
}

export function useDeliveryDates(): DeliveryDateConfig {
  const { hasPerishableItems, hasRegularItems, perishableDeliveryDays } = useCartStore();

  const allowedDays = perishableDeliveryDays();
  const hasMixed = hasPerishableItems() && hasRegularItems();
  const hasPerishable = hasPerishableItems();

  // Earliest date: tomorrow (minimum 24h lead time)
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 1);
  earliest.setHours(0, 0, 0, 0);

  if (!hasPerishable) {
    // All regular items — any day
    return {
      canSelectAnyDay: true,
      allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      earliestDate: earliest,
      deliveryType: 'SINGLE',
    };
  }

  if (allowedDays.length === 0) {
    // Perishable items have incompatible delivery days — must split
    return {
      canSelectAnyDay: false,
      allowedDaysOfWeek: [],
      earliestDate: earliest,
      deliveryType: 'MUST_SPLIT',
    };
  }

  return {
    canSelectAnyDay: false,
    allowedDaysOfWeek: allowedDays,
    earliestDate: earliest,
    deliveryType: hasMixed ? 'CAN_SPLIT' : 'SINGLE',
  };
}
```

---

## Checkout API — Create Order

### `app/api/checkout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { CreateOrderSchema } from '@/lib/validators/order.schema';
import { db } from '@/lib/firebase/admin';
import { calculateOrderPricing } from '@/lib/pricing/calculator';
import { validateDeliveryDate } from '@/lib/scheduling/validator';
import { createOrder, generateOrderNumber } from '@/lib/firestore/orders';
import { initializePaystackTransaction } from '@/lib/paystack/client';

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { address_id, zone_id, delivery_date, delivery_type, items } = parsed.data;

  // ── Validate delivery date against product constraints ────────────────────
  const dateValidation = await validateDeliveryDate(items, delivery_date);
  if (!dateValidation.valid) {
    return NextResponse.json(
      { success: false, error: dateValidation.error },
      { status: 400 }
    );
  }

  // ── Validate zone ─────────────────────────────────────────────────────────
  const zoneSnap = await db.collection('delivery_zones').doc(zone_id).get();
  if (!zoneSnap.exists || !zoneSnap.data()?.is_active) {
    return NextResponse.json(
      { success: false, error: 'Delivery zone not available' },
      { status: 400 }
    );
  }

  // ── Validate address belongs to user ──────────────────────────────────────
  const addressSnap = await db
    .collection('users').doc(user.uid)
    .collection('addresses').doc(address_id)
    .get();
  if (!addressSnap.exists) {
    return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 });
  }

  // ── Fetch & validate each product + stock ────────────────────────────────
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const productSnap = await db.collection('products').doc(item.product_id).get();
    if (!productSnap.exists || !productSnap.data()?.is_active) {
      return NextResponse.json(
        { success: false, error: `Product ${item.product_id} is unavailable` },
        { status: 400 }
      );
    }

    const product = productSnap.data()!;

    // Enforce minimum kg
    if (item.kg_quantity < product.min_kg) {
      return NextResponse.json({
        success: false,
        error: `Minimum order for "${product.name}" is ${product.min_kg}kg`,
      }, { status: 400 });
    }

    // Enforce maximum kg
    if (product.max_kg && item.kg_quantity > product.max_kg) {
      return NextResponse.json({
        success: false,
        error: `Maximum order for "${product.name}" is ${product.max_kg}kg`,
      }, { status: 400 });
    }

    // Check stock
    if (item.kg_quantity > product.stock_kg) {
      return NextResponse.json({
        success: false,
        error: `Only ${product.stock_kg}kg of "${product.name}" available`,
      }, { status: 400 });
    }

    const lineTotal = Math.round(item.kg_quantity * product.price_per_kg);
    subtotal += lineTotal;

    orderItems.push({
      product_id: item.product_id,
      product_name: product.name,
      product_type: product.product_type,
      kg_quantity: item.kg_quantity,
      price_per_kg: product.price_per_kg,
      line_total: lineTotal,
    });
  }

  // ── Calculate pricing ─────────────────────────────────────────────────────
  const zone = zoneSnap.data()!;
  const pricing = calculateOrderPricing({
    subtotal,
    zone,
  });

  // ── Fetch user document ───────────────────────────────────────────────────
  const userSnap = await db.collection('users').doc(user.uid).get();
  const userData = userSnap.data()!;
  const address = addressSnap.data()!;

  // ── Create order in Firestore ─────────────────────────────────────────────
  const orderNumber = generateOrderNumber();
  const orderId = await createOrder(
    {
      order_number: orderNumber,
      user_id: user.uid,
      address: {
        full_address: address.full_address,
        lat: address.lat,
        lng: address.lng,
        city: address.city,
        lga: address.lga,
        instructions: address.instructions,
      },
      zone_id,
      status: 'PENDING_PAYMENT',
      ...pricing,
      delivery_date: new Date(delivery_date),
      delivery_type,
      delivery_notes: parsed.data.delivery_notes ?? null,
      payment_reference: null,
      payment_status: 'PENDING',
      payment_channel: null,
      paid_at: null,
      logistics_provider: null,
      logistics_order_id: null,
      tracking_url: null,
    },
    orderItems
  );

  // ── Initialize Paystack transaction ───────────────────────────────────────
  const paystackRef = `CR_${orderId}_${Date.now()}`;
  const paystackResult = await initializePaystackTransaction({
    email: userData.email,
    amount: pricing.total_amount,   // in kobo
    reference: paystackRef,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      custom_fields: [
        { display_name: 'Order Number', variable_name: 'order_number', value: orderNumber },
      ],
    },
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?payment=success`,
  });

  // Store payment reference on order
  await db.collection('orders').doc(orderId).update({
    payment_reference: paystackRef,
  });

  return NextResponse.json({
    success: true,
    data: {
      order_id: orderId,
      order_number: orderNumber,
      payment_url: paystackResult.data.authorization_url,
      access_code: paystackResult.data.access_code,
      total_amount: pricing.total_amount,
    },
  }, { status: 201 });
}
```

---

## Order Summary Component

### `components/checkout/OrderSummary.tsx`
```typescript
'use client';

import { useCartStore } from '@/store/cart.store';
import { formatCurrency, calcLineTotal } from '@/lib/utils/format';
import { Separator } from '@/components/ui/separator';

interface OrderSummaryProps {
  deliveryFeeKobo: number;
  serviceChargeKobo: number;
  zoneLabel: string;
}

export function OrderSummary({ deliveryFeeKobo, serviceChargeKobo, zoneLabel }: OrderSummaryProps) {
  const { items, subtotalKobo } = useCartStore();
  const subtotal = subtotalKobo();
  const total = subtotal + deliveryFeeKobo + serviceChargeKobo;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <h3 className="font-semibold text-base">Order Summary</h3>

      {/* Items */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.product_id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.product_snapshot.name} × {item.kg_quantity}kg
            </span>
            <span>{formatCurrency(calcLineTotal(item.product_snapshot.price_per_kg, item.kg_quantity))}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Fees */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery to {zoneLabel}</span>
          <span>{formatCurrency(deliveryFeeKobo)}</span>
        </div>
        <div className="flex justify-between">
          <span>Service charge</span>
          <span>{formatCurrency(serviceChargeKobo)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-semibold text-base">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Service charge supports platform development.
      </p>
    </div>
  );
}
```
