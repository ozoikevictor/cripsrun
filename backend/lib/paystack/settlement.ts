import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface VerifiedPayment {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string;
  metadata: Record<string, unknown>;
}

export function validatePayment(order: Record<string, unknown>, orderId: string, payment: VerifiedPayment) {
  if (payment.status !== 'success') throw new Error('Payment not completed');
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.amount !== order.total_amount) throw new Error('Payment amount mismatch');
  if (payment.currency !== (order.currency || 'NGN')) throw new Error('Payment currency mismatch');
  if (!payment.reference || payment.reference !== order.payment_reference) throw new Error('Payment reference mismatch');
  if (payment.metadata?.order_id !== orderId) throw new Error('Payment order mismatch');
  if (!Number.isFinite(Date.parse(payment.paid_at))) throw new Error('Invalid payment timestamp');
}

export async function settleVerifiedPayment(orderId: string, payment: VerifiedPayment, actor: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(orderId) || !/^[A-Za-z0-9_.=-]+$/.test(payment.reference)) throw new Error('Invalid payment identifier');
  const orderRef = db.collection('orders').doc(orderId);
  const paymentRef = db.collection('payments').doc(payment.reference);
  return db.runTransaction(async tx => {
    const orderSnap = await tx.get(orderRef);
    const paymentSnap = await tx.get(paymentRef);
    if (!orderSnap.exists) throw new Error('Order not found');
    const order = orderSnap.data()!;
    validatePayment(order, orderId, payment);
    if (paymentSnap.exists && paymentSnap.data()?.order_id !== orderId) throw new Error('Payment already assigned to another order');
    if (order.payment_status === 'SUCCESS') return { applied: false, status: order.status, order_number: order.order_number };
    if (order.status !== 'PENDING_PAYMENT') throw new Error('Order cannot accept payment in its current state');
    const timestamp = FieldValue.serverTimestamp();
    tx.update(orderRef, { payment_status: 'SUCCESS', status: 'PAYMENT_CONFIRMED', currency: payment.currency, payment_channel: payment.channel, payment_provider: 'paystack', paid_at: new Date(payment.paid_at), updated_at: timestamp });
    tx.create(paymentRef, { order_id: orderId, user_id: order.user_id, amount: payment.amount, currency: payment.currency, reference: payment.reference, status: 'SUCCESS', paid_at: new Date(payment.paid_at), verified_at: timestamp });
    tx.create(orderRef.collection('status_history').doc('payment-confirmed'), { from_status: 'PENDING_PAYMENT', to_status: 'PAYMENT_CONFIRMED', changed_by: actor, note: 'Payment verified by Paystack on server', created_at: timestamp });
    tx.set(db.collection('revenue_records').doc(orderId), { id: orderId, order_id: orderId, order_number: order.order_number, user_id: order.user_id, subtotal: order.subtotal, delivery_spread: order.delivery_spread ?? 0, service_charge: order.service_charge ?? 0, ring_fenced_amount: order.service_charge ?? 0, total_platform_revenue: (order.delivery_spread ?? 0) + (order.service_charge ?? 0), zone_id: order.zone_id ?? null, logistics_provider: order.logistics_provider ?? 'pending', recorded_at: timestamp });
    return { applied: true, status: 'PAYMENT_CONFIRMED', order_number: order.order_number };
  });
}
