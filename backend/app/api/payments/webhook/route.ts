/**
 * Paystack webhook handler — SECURITY CRITICAL.
 * Verifies HMAC-SHA512 signature before processing any event.
 * Writes revenue_records with ring-fenced service_charge.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { transitionOrderStatus } from '@/lib/firestore/orders';
import { writeRevenueRecord } from '@/lib/firestore/revenue';
import { triggerOrderNotifications } from '@/lib/notifications';

/**
 * Verify Paystack HMAC-SHA512 signature.
 * Reference: https://paystack.com/docs/payments/webhooks/
 */
function verifyPaystackSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(request: NextRequest) {
  // Read raw body BEFORE parsing — needed for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  // 1. VERIFY SIGNATURE — MANDATORY, NON-NEGOTIABLE
  if (!signature || !verifyPaystackSignature(rawBody, signature)) {
    console.error('[Webhook] Invalid Paystack signature — rejecting request');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  // 2. Handle charge.success
  if (event.event === 'charge.success') {
    const { reference, amount, channel, paid_at, metadata } = event.data;
    const orderId = metadata?.order_id;

    if (!orderId) {
      console.error('[Webhook] charge.success missing order_id in metadata');
      return NextResponse.json({ received: true });
    }

    try {
      const { db } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');

      // Idempotency check
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

      // CRITICAL: Verify amount matches to prevent underpayment
      if (amount !== order.total_amount) {
        console.error(
          `[Webhook] Amount mismatch for order ${orderId}: ` +
          `expected ${order.total_amount}, got ${amount}`
        );
        return NextResponse.json({ received: true });
      }

      // 3. Update order payment info
      await db.collection('orders').doc(orderId).update({
        payment_status: 'SUCCESS',
        payment_reference: reference,
        payment_channel: channel,
        payment_provider: 'paystack',
        paid_at: new Date(paid_at),
        updated_at: FieldValue.serverTimestamp(),
      });

      // 4. Transition status
      await transitionOrderStatus(
        orderId,
        'PAYMENT_CONFIRMED',
        'paystack_webhook',
        `Payment confirmed via ${channel}`
      );

      // Notify customer and admins before independent revenue bookkeeping.
      await triggerOrderNotifications(orderId, 'PAYMENT_CONFIRMED');

      // Write revenue record (ring-fenced service_charge).
      try {
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
      } catch (revenueError) {
        console.error(`[Webhook] Revenue record failed for ${orderId}:`, revenueError);
      }

    } catch (error) {
      console.error(`[Webhook] Error processing charge.success for ${orderId}:`, error);
    }

    return NextResponse.json({ received: true });
  }

  // Handle charge.failed
  if (event.event === 'charge.failed') {
    const orderId = event.data?.metadata?.order_id;
    if (orderId) {
      try {
        const { db } = await import('@/lib/firebase/admin');
        const { FieldValue } = await import('firebase-admin/firestore');

        await db.collection('orders').doc(orderId).update({
          payment_status: 'FAILED',
          updated_at: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error(`[Webhook] Error handling charge.failed for ${orderId}:`, error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
