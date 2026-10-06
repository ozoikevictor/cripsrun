import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const orderRef = db.collection('orders').doc(params.id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data() ?? {};
    const [itemsSnap, historySnap] = await Promise.all([
      orderRef.collection('items').get(),
      orderRef.collection('status_history').orderBy('created_at', 'asc').get(),
    ]);

    const items = Array.isArray(orderData.items)
      ? orderData.items
      : itemsSnap.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }));

    const statusHistory = historySnap.docs.map((historyDoc) => {
      const data = historyDoc.data();
      return {
        id: historyDoc.id,
        from_status: data.from_status ?? null,
        to_status: data.to_status,
        note: data.note ?? null,
        created_at: toIsoString(data.created_at),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...orderData,
        id: orderSnap.id,
        delivery_date: toIsoString(orderData.delivery_date),
        created_at: toIsoString(orderData.created_at),
        updated_at: toIsoString(orderData.updated_at),
        paid_at: toIsoString(orderData.paid_at),
        items,
        status_history: statusHistory,
      },
    });
  } catch (error) {
    console.error('[Admin Order Detail API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load order' }, { status: 500 });
  }
}
