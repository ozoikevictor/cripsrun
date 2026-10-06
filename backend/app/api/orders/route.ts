import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/server';
import { createOrder, generateOrderNumber } from '@/lib/firestore/orders';

const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        product_name: z.string().min(1),
        product_type: z.string().min(1),
        price_per_kg: z.number().nonnegative(),
        kg_quantity: z.number().positive(),
        line_total: z.number().nonnegative(),
      })
    )
    .min(1),
  subtotal: z.number().nonnegative(),
  delivery_fee: z.number().nonnegative(),
  service_charge: z.number().nonnegative(),
  vat_rate: z.number().nonnegative(),
  vat_amount: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  address: z.object({
    full_address: z.string().min(1),
    city: z.string().optional(),
    lga: z.string().optional(),
    instructions: z.string().nullable().optional(),
  }),
  delivery_date: z.string().min(1),
});

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
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const orderNumber = generateOrderNumber();
    const orderId = await createOrder(
      {
        order_number: orderNumber,
        user_id: user.uid,
        user_email: user.email ?? '',
        items: parsed.data.items,
        subtotal: parsed.data.subtotal,
        delivery_fee: parsed.data.delivery_fee,
        service_charge: parsed.data.service_charge,
        vat_rate: parsed.data.vat_rate,
        vat_amount: parsed.data.vat_amount,
        total_amount: parsed.data.total_amount,
        address: parsed.data.address,
        status: 'PENDING_PAYMENT',
        delivery_date: new Date(parsed.data.delivery_date),
      },
      parsed.data.items
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          order_id: orderId,
          order_number: orderNumber,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Orders API] Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
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
