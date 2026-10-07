import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    // Firestore Timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timestamp = (value as any).toDate;
    if (typeof timestamp === 'function') {
      return (value as any).toDate().toISOString();
    }
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function getTimeFromValue(value: unknown): number {
  if (!value) return 0;
  // Firestore Timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().getTime();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: false, error: 'Create orders through checkout so prices are calculated on the server.' }, { status: 405, headers: { Allow: 'GET' } });
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    // Avoid composite index requirement by querying by user_id only,
    // then sort by created_at in JavaScript.
    const ordersSnap = await db
      .collection('orders')
      .where('user_id', '==', user.uid)
      .get();

    const docs = ordersSnap.docs.slice().sort((a, b) => {
      const aTime = getTimeFromValue(a.data().created_at);
      const bTime = getTimeFromValue(b.data().created_at);
      return bTime - aTime; // descending
    });

    const orders = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        order_number: data.order_number,
        status: data.status,
        total_amount: data.total_amount,
        payment_status: data.payment_status ?? 'PENDING',
        logistics_provider: data.logistics_provider ?? null,
        tracking_url: data.tracking_url ?? null,
        items_count: Array.isArray(data.items) ? data.items.length : 0,
        vat_amount: data.vat_amount ?? 0,
        vat_rate: data.vat_rate ?? 0,
        delivery_date: toIsoString(data.delivery_date) ?? '',
        address: data.address ?? {},
        created_at: toIsoString(data.created_at) ?? '',
      };
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Orders API] List orders error:', errorMessage);
    return NextResponse.json(
      { success: false, error: `Failed to load orders: ${errorMessage}` },
      { status: 500 }
    );
  }
}
