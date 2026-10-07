import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase/admin';
import { verifyPaystackTransaction } from '@/lib/paystack/client';
import { settleVerifiedPayment } from '@/lib/paystack/settlement';
import { triggerOrderNotifications } from '@/lib/notifications';

export function verifyPaystackSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha512', secret).update(body).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get('x-paystack-signature') || '')) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }); }
  if (event?.event !== 'charge.success') return NextResponse.json({ received: true });
  const reference = event.data?.reference;
  if (typeof reference !== 'string' || !/^[A-Za-z0-9_.=-]{1,150}$/.test(reference)) return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
  try {
    const orders = await db.collection('orders').where('payment_reference', '==', reference).limit(2).get();
    if (orders.empty) return NextResponse.json({ received: true });
    if (orders.size !== 1) throw new Error('Ambiguous payment reference');
    const verified = await verifyPaystackTransaction(reference);
    if (!verified.status) throw new Error('Provider verification failed');
    const order = orders.docs[0];
    const settled = await settleVerifiedPayment(order.id, verified.data, 'paystack_webhook');
    if (settled.applied) await triggerOrderNotifications(order.id, 'PAYMENT_CONFIRMED');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Payment processing failed', error);
    return NextResponse.json({ received: false }, { status: 503 });
  }
}
