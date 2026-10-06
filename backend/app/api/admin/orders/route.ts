/**
 * Admin Orders API.
 * GET: Fetch all orders for admin users.
 *
 * MANDATORY: Admin role check.
 */

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
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().getTime();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';

    let snap;
    if (/^CR-\d{8}-\d+/i.test(search)) {
      snap = await db
        .collection('orders')
        .where('order_number', '==', search.toUpperCase())
        .limit(10)
        .get();
    } else {
      snap = await db
        .collection('orders')
        .orderBy('created_at', 'desc')
        .get();
    }
    const docs = snap.docs.slice().sort((a, b) => {
      const aTime = getTimeFromValue(a.data().created_at);
      const bTime = getTimeFromValue(b.data().created_at);
      return bTime - aTime;
    });

    const orders = docs.map((doc) => {
        const data = doc.data();
        const customerName =
          data.customer_name ??
          data.user_name ??
          data.address?.name ??
          data.address?.full_name ??
          '';

        return {
          id: doc.id,
          order_number: data.order_number,
          user_email: data.user_email ?? '',
          customer_name: customerName,
          address: {
            full_address: data.address?.full_address ?? '',
            city: data.address?.city ?? '',
            lga: data.address?.lga ?? '',
          },
          status: data.status,
          total_amount: data.total_amount,
          delivery_date: toIsoString(data.delivery_date) ?? '',
          created_at: toIsoString(data.created_at) ?? '',
        };
      });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Admin Orders API] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
