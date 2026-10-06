/**
 * Payment verification endpoint — polling fallback.
 * Used when webhook hasn't been received yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { verifyPaystackTransaction } from '@/lib/paystack/client';
import { transitionOrderStatus } from '@/lib/firestore/orders';

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await verifyPaystackTransaction(params.reference);
    const { data } = result;

    if (data.status !== 'success') {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
        data: { payment_status: data.status },
      });
    }

    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    const orderSnap = await db.collection('orders')
      .where('payment_reference', '==', params.reference)
      .limit(1)
      .get();

    if (orderSnap.empty) {
      return NextResponse.json({
        success: false,
        error: 'Order not found',
      }, { status: 404 });
    }

    const orderDoc = orderSnap.docs[0];
    const order = orderDoc.data();
    const orderId = orderDoc.id;

    if (order.payment_status === 'SUCCESS' && order.status === 'PAYMENT_CONFIRMED') {
      return NextResponse.json({
        success: true,
        data: {
          order_id: orderId,
          order_number: order.order_number,
          payment_status: order.payment_status,
          order_status: order.status,
        },
      });
    }

    if (data.amount !== order.total_amount) {
      console.error(
        `[Payment Verify] Amount mismatch for order ${orderId}: expected ${order.total_amount}, got ${data.amount}`
      );
      return NextResponse.json({
        success: false,
        error: 'Payment amount mismatch',
      }, { status: 400 });
    }

    await db.collection('orders').doc(orderId).update({
      payment_status: 'SUCCESS',
      payment_reference: data.reference,
      payment_channel: data.channel,
      payment_provider: 'paystack',
      paid_at: data.paid_at ? new Date(data.paid_at) : new Date(),
      updated_at: FieldValue.serverTimestamp(),
    });

    if (order.status !== 'PAYMENT_CONFIRMED') {
      await transitionOrderStatus(
        orderId,
        'PAYMENT_CONFIRMED',
        user.uid,
        `Payment confirmed via ${data.channel}`
      );

      try {
        const { triggerOrderNotifications } = await import('@/lib/notifications');
        await triggerOrderNotifications(orderId, 'PAYMENT_CONFIRMED');
      } catch (notificationError) {
        console.error('[Payment Verify] Notification failed:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: order.order_number,
        payment_status: 'SUCCESS',
        order_status: 'PAYMENT_CONFIRMED',
      },
    });
  } catch (error) {
    console.error('[Payment Verify] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
