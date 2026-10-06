# Skill 08 — Order Management

> Use this skill when: building order listing/detail views, order timeline, admin order
> processing, status transitions, or the customer tracking page.

---

## Customer: Order History & Detail

### `app/(customer)/orders/page.tsx`
```typescript
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/empty-state';
import { redirect } from 'next/navigation';

export default async function OrdersPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const ordersSnap = await db
    .collection('orders')
    .where('user_id', '==', session.uid)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get();

  const orders = ordersSnap.docs.map(d => d.data());

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Place your first order to get fresh food delivered to you."
        action={{ label: 'Start Shopping', href: '/catalog' }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
```

### `components/orders/OrderCard.tsx`
```typescript
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { formatDistanceToNow } from 'date-fns';
import type { OrderDocument, OrderStatus } from '@/types/order.types';
import { Package, MapPin, Calendar } from 'lucide-react';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  PENDING_PAYMENT:   { label: 'Awaiting Payment',   variant: 'secondary' },
  PAYMENT_CONFIRMED: { label: 'Confirmed',           variant: 'default' },
  PROCESSING:        { label: 'Processing',          variant: 'default' },
  AWAITING_PICKUP:   { label: 'Awaiting Pickup',     variant: 'default' },
  IN_TRANSIT:        { label: 'On the Way',          variant: 'default' },
  DELIVERED:         { label: 'Delivered',           variant: 'success' },
  CANCELLED:         { label: 'Cancelled',           variant: 'destructive' },
  FAILED_DELIVERY:   { label: 'Delivery Failed',     variant: 'destructive' },
};

export function OrderCard({ order }: { order: OrderDocument }) {
  const statusCfg = STATUS_CONFIG[order.status];

  return (
    <Link href={`/orders/${order.id}`} className="block">
      <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{order.order_number}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(order.created_at.toDate(), { addSuffix: true })}
            </p>
          </div>
          <Badge variant={statusCfg.variant as any}>{statusCfg.label}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{order.address.full_address}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>Delivery: {new Date(order.delivery_date.toDate()).toLocaleDateString('en-NG', {
            weekday: 'short', month: 'short', day: 'numeric'
          })}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>
    </Link>
  );
}
```

### `components/orders/OrderTimeline.tsx`
```typescript
'use client';

import { CheckCircle, Circle, XCircle, Loader2 } from 'lucide-react';
import type { OrderStatus } from '@/types/order.types';

const TIMELINE_STEPS: Array<{ status: OrderStatus; label: string; description: string }> = [
  {
    status: 'PENDING_PAYMENT',
    label: 'Order Placed',
    description: 'Waiting for payment',
  },
  {
    status: 'PAYMENT_CONFIRMED',
    label: 'Payment Confirmed',
    description: 'Your payment was received',
  },
  {
    status: 'PROCESSING',
    label: 'Processing',
    description: 'Preparing your order',
  },
  {
    status: 'AWAITING_PICKUP',
    label: 'Ready for Pickup',
    description: 'Rider is on the way',
  },
  {
    status: 'IN_TRANSIT',
    label: 'On the Way',
    description: 'Your order is being delivered',
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    description: 'Your order has arrived',
  },
];

const STATUS_ORDER: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'AWAITING_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
];

export function OrderTimeline({
  currentStatus,
  statusHistory,
}: {
  currentStatus: OrderStatus;
  statusHistory: Array<{ to_status: OrderStatus; created_at: any; note: string | null }>;
}) {
  const isFailed = currentStatus === 'CANCELLED' || currentStatus === 'FAILED_DELIVERY';
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, index) => {
        const stepIndex = STATUS_ORDER.indexOf(step.status);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step.status === currentStatus;
        const historyEntry = statusHistory.find(h => h.to_status === step.status);

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-1 flex-shrink-0 ${
                isCompleted ? 'text-green-500' :
                isCurrent && !isFailed ? 'text-primary' :
                'text-muted-foreground'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : isCurrent && !isFailed ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div className={`w-px flex-1 my-1 ${isCompleted ? 'bg-green-300' : 'bg-border'}`} />
              )}
            </div>
            <div className="pb-4">
              <p className={`text-sm font-medium ${!isCompleted && !isCurrent ? 'text-muted-foreground' : ''}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
              {historyEntry && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(historyEntry.created_at.toDate()).toLocaleString('en-NG', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {isFailed && (
        <div className="flex items-center gap-2 text-destructive mt-2">
          <XCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            {currentStatus === 'CANCELLED' ? 'Order Cancelled' : 'Delivery Failed'}
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## Admin: Order Management

### `app/(admin)/orders/page.tsx` (Order List)
```typescript
import { db } from '@/lib/firebase/admin';
import { DataTable } from '@/components/admin/DataTable';
import { columns } from './columns';
import { OrderFilters } from '@/components/admin/OrderFilters';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; date?: string };
}) {
  let q = db.collection('orders').orderBy('created_at', 'desc');

  if (searchParams.status) {
    q = q.where('status', '==', searchParams.status) as any;
  }

  if (searchParams.date) {
    const date = new Date(searchParams.date);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    q = q
      .where('delivery_date', '>=', date)
      .where('delivery_date', '<', nextDay) as any;
  }

  const snap = await q.limit(50).get();
  const orders = snap.docs.map(d => d.data());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <OrderFilters />
      </div>
      <DataTable columns={columns} data={orders} />
    </div>
  );
}
```

### Admin Order Detail Actions
```typescript
// Key actions available on each order in admin panel:
const ADMIN_ORDER_ACTIONS = [
  {
    label: 'Confirm & Dispatch',
    requiresStatus: 'PAYMENT_CONFIRMED',
    action: 'dispatch',          // Calls /api/admin/orders/[id]/dispatch
    variant: 'default',
  },
  {
    label: 'Mark Awaiting Pickup',
    requiresStatus: 'PROCESSING',
    action: 'awaiting_pickup',
    variant: 'default',
  },
  {
    label: 'Mark In Transit',
    requiresStatus: 'AWAITING_PICKUP',
    action: 'in_transit',
    variant: 'default',
  },
  {
    label: 'Mark Delivered',
    requiresStatus: 'IN_TRANSIT',
    action: 'delivered',
    variant: 'success',
  },
  {
    label: 'Cancel Order',
    requiresStatus: ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING'],
    action: 'cancel',
    variant: 'destructive',
    requiresNote: true,
  },
  {
    label: 'Mark Failed Delivery',
    requiresStatus: 'IN_TRANSIT',
    action: 'failed_delivery',
    variant: 'destructive',
    requiresNote: true,
  },
];
```

---

## Order Status Update API

### `app/api/admin/orders/[id]/status/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { z } from 'zod';
import { transitionOrderStatus } from '@/lib/firestore/orders';
import { triggerOrderNotifications } from '@/lib/notifications';
import type { OrderStatus } from '@/types/order.types';

const UpdateStatusSchema = z.object({
  status: z.enum([
    'AWAITING_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED_DELIVERY'
  ]),
  note: z.string().max(500).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = UpdateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422 });
  }

  try {
    await transitionOrderStatus(
      params.id,
      parsed.data.status as OrderStatus,
      user.uid,
      parsed.data.note
    );

    await triggerOrderNotifications(params.id, parsed.data.status as OrderStatus);

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transition failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
```

---

## Customer Cancel Order

### `app/api/orders/[id]/cancel/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { db } from '@/lib/firebase/admin';
import { transitionOrderStatus } from '@/lib/firestore/orders';

// Customers can only cancel BEFORE processing begins
const CUSTOMER_CANCELLABLE_STATUSES = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const orderSnap = await db.collection('orders').doc(params.id).get();
  if (!orderSnap.exists) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  const order = orderSnap.data()!;

  // Ensure order belongs to this customer
  if (order.user_id !== user.uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    return NextResponse.json({
      success: false,
      error: 'This order can no longer be cancelled. Please contact support.',
    }, { status: 400 });
  }

  await transitionOrderStatus(params.id, 'CANCELLED', user.uid, 'Cancelled by customer');

  // If payment was already made, flag for refund review
  if (order.payment_status === 'SUCCESS') {
    await db.collection('refund_requests').doc(params.id).set({
      order_id: params.id,
      order_number: order.order_number,
      user_id: user.uid,
      amount: order.total_amount,
      payment_reference: order.payment_reference,
      status: 'pending_review',
      created_at: new Date(),
    });
  }

  return NextResponse.json({ success: true, message: 'Order cancelled' });
}
```

---

## Repeat Order Feature

```typescript
// lib/orders/repeat-order.ts
import { db } from '@/lib/firebase/admin';
import type { OrderItemDocument } from '@/types/order.types';

/**
 * Builds a pre-filled cart from a past order.
 * Validates that all products are still active and have sufficient stock.
 * Returns items that can be re-ordered, and a list of unavailable items.
 */
export async function buildRepeatOrder(orderId: string): Promise<{
  cartItems: Array<{ product_id: string; kg_quantity: number; snapshot: any }>;
  unavailable: Array<{ product_name: string; reason: string }>;
}> {
  const itemsSnap = await db
    .collection('orders').doc(orderId)
    .collection('items').get();

  const cartItems = [];
  const unavailable = [];

  for (const itemDoc of itemsSnap.docs) {
    const item = itemDoc.data() as OrderItemDocument;
    const productSnap = await db.collection('products').doc(item.product_id).get();

    if (!productSnap.exists || !productSnap.data()?.is_active) {
      unavailable.push({ product_name: item.product_name, reason: 'No longer available' });
      continue;
    }

    const product = productSnap.data()!;
    if (product.stock_kg < item.kg_quantity) {
      unavailable.push({ product_name: item.product_name, reason: `Only ${product.stock_kg}kg available` });
      continue;
    }

    cartItems.push({
      product_id: item.product_id,
      kg_quantity: item.kg_quantity,
      snapshot: {
        name: product.name,
        price_per_kg: product.price_per_kg,
        image_url: product.image_urls[0],
        min_kg: product.min_kg,
        max_kg: product.max_kg,
        kg_increment: product.kg_increment,
        product_type: product.product_type,
      },
    });
  }

  return { cartItems, unavailable };
}
```
