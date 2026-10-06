import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

function asDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') {
      try {
        const date = toDate.call(value);
        return Number.isNaN(date.getTime()) ? null : date;
      } catch {
        // Some imported or partially-written Firestore-like values expose
        // toDate() but are missing their internal timestamp fields.
      }
    }
  }
  if (value && typeof value === 'object') {
    const timestamp = value as {
      _seconds?: number;
      seconds?: number;
      _nanoseconds?: number;
      nanoseconds?: number;
    };
    const seconds = timestamp._seconds ?? timestamp.seconds;

    if (typeof seconds === 'number') {
      const nanoseconds =
        typeof timestamp._nanoseconds === 'number'
          ? timestamp._nanoseconds
          : typeof timestamp.nanoseconds === 'number'
            ? timestamp.nanoseconds
            : 0;
      return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
    }
  }
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function isSameDay(value: string | null, date: Date) {
  const created = asDate(value);
  return created !== null && created.toDateString() === date.toDateString();
}

function isSameMonth(value: string | null, date: Date) {
  const created = asDate(value);
  return (
    created !== null &&
    created.getFullYear() === date.getFullYear() &&
    created.getMonth() === date.getMonth()
  );
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let failureStage = 'initialize Firestore';
  try {
    const { db } = await import('@/lib/firebase/admin');
    failureStage = 'read orders';
    const ordersSnapshot = await db.collection('orders').get();
    failureStage = 'read products';
    const productsSnapshot = await db.collection('products').get();
    failureStage = 'read categories';
    const categoriesSnapshot = await db.collection('categories').get();
    failureStage = 'process Firestore records';

    const orders = ordersSnapshot.docs.map((doc) => {
      try {
        const data = doc.data();
        const createdAt = asDate(data.created_at);
        return {
          id: doc.id,
          order_number: data.order_number ?? doc.id,
          status: data.status ?? 'PENDING_PAYMENT',
          total_amount: Number(data.total_amount ?? 0),
          subtotal: Number(data.subtotal ?? 0),
          delivery_fee: Number(data.delivery_fee ?? 0),
          service_charge: Number(data.service_charge ?? 0),
          created_at: createdAt?.toISOString() ?? null,
        };
      } catch (recordError) {
        console.warn('[Admin Dashboard API] Skipping malformed order:', doc.id, recordError);
        return {
          id: doc.id,
          order_number: doc.id,
          status: 'PENDING_PAYMENT',
          total_amount: 0,
          subtotal: 0,
          delivery_fee: 0,
          service_charge: 0,
          created_at: null,
        };
      }
    }).sort((a, b) => {
      const aTime = asDate(a.created_at)?.getTime() ?? 0;
      const bTime = asDate(b.created_at)?.getTime() ?? 0;
      return bTime - aTime;
    });

    const products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.data().name ?? 'Unnamed product'),
      stock_kg: Number(doc.data().stock_kg ?? 0),
      low_stock_threshold: Number(doc.data().low_stock_threshold ?? 0),
      is_active: doc.data().is_active !== false,
    }));

    const now = new Date();
    const todayOrders = orders.filter((order) => isSameDay(order.created_at, now));
    const monthOrders = orders.filter((order) => isSameMonth(order.created_at, now));
    const paidOrders = orders.filter((order) => !['PENDING_PAYMENT', 'CANCELLED'].includes(order.status));
    const pendingDispatch = orders.filter((order) =>
      ['PAYMENT_CONFIRMED', 'PROCESSING', 'AWAITING_PICKUP'].includes(order.status)
    ).length;
    const paidTodayOrders = todayOrders.filter((order) => !['PENDING_PAYMENT', 'CANCELLED'].includes(order.status));
    const paidMonthOrders = monthOrders.filter((order) => !['PENDING_PAYMENT', 'CANCELLED'].includes(order.status));

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          today_revenue: paidTodayOrders.reduce((sum, order) => sum + order.total_amount, 0),
          orders_today: todayOrders.length,
          pending_dispatch: pendingDispatch,
          fleet_fund_balance: paidOrders.reduce((sum, order) => sum + order.service_charge, 0),
          product_revenue_mtd: paidMonthOrders.reduce((sum, order) => sum + order.subtotal, 0),
          delivery_fees_mtd: paidMonthOrders.reduce((sum, order) => sum + order.delivery_fee, 0),
          service_charges_mtd: paidMonthOrders.reduce((sum, order) => sum + order.service_charge, 0),
        },
        recent_orders: orders.slice(0, 5),
        low_stock_products: products.filter((product) => product.is_active && product.stock_kg <= product.low_stock_threshold),
        product_count: products.length,
        category_count: categoriesSnapshot.size,
        order_count: orders.length,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard API] Error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: process.env.NODE_ENV === 'development'
        ? `Dashboard failed to ${failureStage}: ${detail}`
        : 'Failed to load dashboard data',
    }, { status: 500 });
  }
}
