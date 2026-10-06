/**
 * Customer cancel order API.
 * Only allowed for PENDING_PAYMENT and PAYMENT_CONFIRMED statuses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { transitionOrderStatus } from '@/lib/firestore/orders';

const CUSTOMER_CANCELLABLE_STATUSES = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');

    const orderSnap = await db.collection('orders').doc(params.id).get();
    if (!orderSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderSnap.data()!;

    // Ensure order belongs to this customer
    if (order.user_id !== user.uid) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json({
        success: false,
        error: 'This order can no longer be cancelled. Please contact support.',
      }, { status: 400 });
    }

    await transitionOrderStatus(
      params.id,
      'CANCELLED',
      user.uid,
      'Cancelled by customer'
    );

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

    return NextResponse.json({
      success: true,
      message: 'Order cancelled',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cancel failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
