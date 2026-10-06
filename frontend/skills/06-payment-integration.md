# Skill 06 — Payment Integration (Paystack)

> Use this skill when: initializing payments, handling webhooks, verifying transactions,
> or processing refunds.
> SECURITY CRITICAL: Webhook verification is NON-NEGOTIABLE.

---

## Architecture

```
1. Checkout API creates order (PENDING_PAYMENT) + initializes Paystack transaction
2. Client opens Paystack inline widget with access_code
3. Customer pays → Paystack sends webhook to /api/payments/webhook
4. Webhook handler verifies signature → updates order → triggers notifications + logistics
5. Payment verification endpoint available for client-side polling fallback
```

---

## Paystack Client Wrapper

### `lib/paystack/client.ts`
```typescript
const PAYSTACK_BASE = 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

async function paystackRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Paystack API error: ${data.message ?? response.statusText}`);
  }

  return data;
}

/** Initialize a Paystack transaction */
export async function initializePaystackTransaction(params: {
  email: string;
  amount: number;           // in kobo (integer)
  reference: string;
  metadata?: object;
  callback_url?: string;
  channels?: string[];
}) {
  return paystackRequest<{
    status: boolean;
    data: { authorization_url: string; access_code: string; reference: string };
  }>('POST', '/transaction/initialize', {
    ...params,
    channels: params.channels ?? ['card', 'bank', 'ussd', 'bank_transfer'],
  });
}

/** Verify a Paystack transaction by reference */
export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<{
    status: boolean;
    data: {
      status: string;         // "success" | "failed" | "abandoned"
      reference: string;
      amount: number;         // kobo
      channel: string;
      currency: string;
      paid_at: string;
      metadata: any;
    };
  }>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Initiate a refund */
export async function refundPaystackTransaction(params: {
  transaction_reference: string;
  amount?: number;           // kobo — omit for full refund
  merchant_note?: string;
}) {
  return paystackRequest('POST', '/refund', params);
}
```

---

## Webhook Handler — CRITICAL

### `app/api/payments/webhook/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { transitionOrderStatus } from '@/lib/firestore/orders';
import { triggerOrderNotifications } from '@/lib/notifications';
import { writeRevenueRecord } from '@/lib/firestore/revenue';

// Paystack sends webhook to this endpoint on payment events.
// MUST be a raw body — do NOT parse with NextRequest.json() before verification.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  // ── 1. VERIFY SIGNATURE — MANDATORY ───────────────────────────────────────
  if (!signature || !verifyPaystackSignature(rawBody, signature)) {
    console.error('[Webhook] Invalid Paystack signature — rejecting request');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  // ── 2. Handle charge.success ──────────────────────────────────────────────
  if (event.event === 'charge.success') {
    const { reference, amount, channel, paid_at, metadata } = event.data;
    const orderId = metadata?.order_id;

    if (!orderId) {
      console.error('[Webhook] charge.success missing order_id in metadata');
      return NextResponse.json({ received: true }); // Acknowledge to Paystack
    }

    // Idempotency: check if already processed
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
      console.error(`[Webhook] Order ${orderId} not found`);
      return NextResponse.json({ received: true });
    }

    const order = orderSnap.data()!;

    if (order.payment_status === 'SUCCESS') {
      // Already processed — safe to return 200 (idempotent)
      return NextResponse.json({ received: true });
    }

    // Verify amount matches (CRITICAL: prevent underpayment)
    if (amount !== order.total_amount) {
      console.error(`[Webhook] Amount mismatch for order ${orderId}: expected ${order.total_amount}, got ${amount}`);
      // Log for manual review — don't crash, return 200 to prevent Paystack retries
      return NextResponse.json({ received: true });
    }

    // ── 3. Update order ───────────────────────────────────────────────────
    await db.collection('orders').doc(orderId).update({
      payment_status: 'SUCCESS',
      payment_reference: reference,
      payment_channel: channel,
      paid_at: new Date(paid_at),
      updated_at: FieldValue.serverTimestamp(),
    });

    // ── 4. Transition status ───────────────────────────────────────────────
    await transitionOrderStatus(orderId, 'PAYMENT_CONFIRMED', 'paystack_webhook',
      `Payment confirmed via ${channel}`
    );

    // ── 5. Write revenue record (ring-fenced service charge) ───────────────
    await writeRevenueRecord({
      order_id: orderId,
      order_number: order.order_number,
      user_id: order.user_id,
      subtotal: order.subtotal,
      delivery_spread: order.delivery_spread,
      service_charge: order.service_charge,
      ring_fenced_amount: order.service_charge,
      total_platform_revenue: order.delivery_spread + order.service_charge,
      zone_id: order.zone_id,
      logistics_provider: order.logistics_provider ?? 'pending',
    });

    // ── 6. Trigger notifications ──────────────────────────────────────────
    await triggerOrderNotifications(orderId, 'PAYMENT_CONFIRMED');

    return NextResponse.json({ received: true });
  }

  // Handle other events if needed (charge.failed, refund.processed, etc.)
  if (event.event === 'charge.failed') {
    const orderId = event.data?.metadata?.order_id;
    if (orderId) {
      await db.collection('orders').doc(orderId).update({
        payment_status: 'FAILED',
        updated_at: FieldValue.serverTimestamp(),
      });
    }
  }

  return NextResponse.json({ received: true });
}

/**
 * Verify Paystack HMAC-SHA512 signature.
 * Reference: https://paystack.com/docs/payments/webhooks/
 */
function verifyPaystackSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');
  return hash === signature;
}
```

---

## Client-Side Payment Flow

### `components/checkout/PaystackButton.tsx`
```typescript
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Install: npm install @paystack/inline-js
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: object) => { openIframe: () => void };
    };
  }
}

interface PaystackButtonProps {
  accessCode: string;
  orderId: string;
  totalAmount: number;
  isLoading?: boolean;
}

export function PaystackButton({ accessCode, orderId, totalAmount, isLoading }: PaystackButtonProps) {
  const router = useRouter();

  const openPaystack = useCallback(() => {
    const paystack = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      access_code: accessCode,
      onClose: () => {
        // User closed modal — order remains PENDING_PAYMENT
        console.log('Payment modal closed');
      },
      callback: (response: { reference: string }) => {
        // Payment completed — verify on server
        router.push(`/orders/${orderId}?payment=success&ref=${response.reference}`);
      },
    });
    paystack.openIframe();
  }, [accessCode, orderId, router]);

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={openPaystack}
      disabled={isLoading}
    >
      {isLoading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
      ) : (
        `Pay ${formatCurrency(totalAmount)}`
      )}
    </Button>
  );
}
```

---

## Revenue Record Writer

### `lib/firestore/revenue.ts`
```typescript
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { RevenueRecordDocument } from '@/types/revenue.types';

export async function writeRevenueRecord(
  data: Omit<RevenueRecordDocument, 'id' | 'recorded_at'>
): Promise<void> {
  // Idempotent: use order_id as document ID
  const ref = db.collection('revenue_records').doc(data.order_id);
  const existing = await ref.get();

  if (existing.exists) {
    console.log(`[Revenue] Record for order ${data.order_id} already exists — skipping`);
    return;
  }

  await ref.set({
    ...data,
    id: data.order_id,
    recorded_at: FieldValue.serverTimestamp(),
  });
}
```

---

## Payment Verification Endpoint (Polling Fallback)

### `app/api/payments/verify/[reference]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { verifyPaystackTransaction } from '@/lib/paystack/client';
import { db } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await verifyPaystackTransaction(params.reference);

  if (result.data.status === 'success') {
    // Double-check in DB
    const orderSnap = await db.collection('orders')
      .where('payment_reference', '==', params.reference)
      .limit(1).get();

    if (!orderSnap.empty) {
      const order = orderSnap.docs[0].data();
      return NextResponse.json({
        success: true,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
          order_status: order.status,
        },
      });
    }
  }

  return NextResponse.json({
    success: false,
    data: { payment_status: result.data.status },
  });
}
```
