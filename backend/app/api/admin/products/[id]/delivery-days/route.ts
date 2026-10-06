/**
 * Admin Delivery Days API for perishable products.
 * PUT: Replace delivery day configuration for a product.
 *
 * MANDATORY: Admin role check. Only for PERISHABLE products.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const DeliveryDaySchema = z.object({
  delivery_days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),    // 0=Sun, 6=Sat
    cutoff_hours: z.number().int().min(1).max(72),  // hours before delivery day
  })).min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');

    const product = await db.collection('products').doc(params.id).get();
    if (!product.exists) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.data()?.product_type !== 'PERISHABLE') {
      return NextResponse.json(
        { success: false, error: 'Delivery days can only be set on PERISHABLE products' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = DeliveryDaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const batch = db.batch();

    // Delete existing delivery days
    const existing = await db
      .collection('products')
      .doc(params.id)
      .collection('delivery_days')
      .get();
    existing.docs.forEach((doc) => batch.delete(doc.ref));

    // Write new delivery days
    parsed.data.delivery_days.forEach((day) => {
      const dayRef = db
        .collection('products')
        .doc(params.id)
        .collection('delivery_days')
        .doc();
      batch.set(dayRef, {
        id: dayRef.id,
        product_id: params.id,
        day_of_week: day.day_of_week,
        cutoff_hours: day.cutoff_hours,
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Delivery days updated',
    });
  } catch (error) {
    console.error('[Admin DeliveryDays] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update delivery days' },
      { status: 500 }
    );
  }
}
