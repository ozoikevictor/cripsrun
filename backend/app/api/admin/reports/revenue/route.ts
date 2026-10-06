import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

function toIsoString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') return toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const snapshot = await db.collection('orders').get();
    const records = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const deliverySpread = Number(data.delivery_spread ?? 0);
        const serviceCharge = Number(data.service_charge ?? 0);
        return {
          order_id: doc.id,
          order_number: data.order_number ?? doc.id,
          subtotal: Number(data.subtotal ?? 0),
          delivery_spread: deliverySpread,
          service_charge: serviceCharge,
          ring_fenced_amount: serviceCharge,
          total_platform_revenue: deliverySpread + serviceCharge,
          logistics_provider: data.logistics_provider ?? 'Not dispatched',
          recorded_at: toIsoString(data.paid_at ?? data.created_at),
          status: data.status ?? 'PENDING_PAYMENT',
        };
      })
      .filter((record) => !['PENDING_PAYMENT', 'CANCELLED'].includes(record.status))
      .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at));

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('[Admin Revenue API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load revenue report' }, { status: 500 });
  }
}