import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { verifyPaystackTransaction } from '@/lib/paystack/client';
import { settleVerifiedPayment } from '@/lib/paystack/settlement';
import { db } from '@/lib/firebase/admin';
import { triggerOrderNotifications } from '@/lib/notifications';

export async function GET(request: NextRequest, { params }: { params: { reference: string } }) {
  const user = await authenticateRequest(request.headers);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!/^[A-Za-z0-9_.=-]{1,150}$/.test(params.reference)) return NextResponse.json({ success: false, error: 'Invalid reference' }, { status: 400 });
  try {
    const snapshot = await db.collection('orders').where('payment_reference', '==', params.reference).limit(2).get();
    if (snapshot.size !== 1) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    const order = snapshot.docs[0];
    if (order.data().user_id !== user.uid && user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const result = await verifyPaystackTransaction(params.reference);
    if (!result.status || result.data.status !== 'success') return NextResponse.json({ success: false, error: 'Payment not completed' });
    const settled = await settleVerifiedPayment(order.id, result.data, user.uid);
    if (settled.applied) await triggerOrderNotifications(order.id, 'PAYMENT_CONFIRMED');
    return NextResponse.json({ success: true, data: { order_id: order.id, order_number: settled.order_number, payment_status: 'SUCCESS', order_status: settled.status } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[Payment Verify] Verification failed', error);
    return NextResponse.json({ success: false, error: 'Unable to verify payment. Please retry.' }, { status: 503 });
  }
}
