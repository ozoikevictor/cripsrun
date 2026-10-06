import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const orderRef = db.collection('orders').doc(params.id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data();
    if (!orderData || orderData.user_id !== user.uid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const statusesSnap = await orderRef
      .collection('status_history')
      .orderBy('created_at', 'asc')
      .get();

    const statusHistory = statusesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        from_status: data.from_status ?? null,
        to_status: data.to_status,
        note: data.note ?? null,
        created_at: data.created_at?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    const responsePayload = {
      ...orderData,
      id: orderSnap.id,
      delivery_date: orderData.delivery_date?.toDate?.()?.toISOString?.() ?? null,
      created_at: orderData.created_at?.toDate?.()?.toISOString?.() ?? null,
      updated_at: orderData.updated_at?.toDate?.()?.toISOString?.() ?? null,
      items: Array.isArray(orderData.items)
        ? orderData.items
        : await orderRef
            .collection('items')
            .get()
            .then((snap) =>
              snap.docs.map((itemDoc) => ({
                id: itemDoc.id,
                ...itemDoc.data(),
              }))
            ),
      status_history: statusHistory,
    };

    return NextResponse.json({ success: true, data: responsePayload });
  } catch (error) {
    console.error('[Order Detail API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load order' },
      { status: 500 }
    );
  }
}
