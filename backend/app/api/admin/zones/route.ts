/**
 * Admin Zone CRUD API.
 * GET: List all zones (admin gets internal fields).
 * POST: Create a new zone.
 *
 * MANDATORY: Admin role check on all mutating operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const ZoneSchema = z
  .object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    lgas: z.array(z.string()).min(1),
    areas: z.array(z.string()).default([]),
    // All values in kobo
    base_logistics_cost: z.number().int().positive(),
    customer_delivery_fee: z.number().int().positive(),
    service_charge: z
      .number()
      .int()
      .min(50_000)
      .max(200_000), // ₦500–₦2,000 range
    estimated_delivery_minutes: z.number().int().min(10).max(480),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => data.customer_delivery_fee > data.base_logistics_cost,
    {
      message:
        'Customer delivery fee must exceed logistics cost (spread must be positive)',
    }
  );

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request.headers);

  try {
    const { db } = await import('@/lib/firebase/admin');
    const snap = await db
      .collection('delivery_zones')
      .orderBy('name', 'asc')
      .get();

    const zones = snap.docs.map((d) => {
      const zone = d.data();
      // Strip internal fields for non-admins
      if (!user || user.role !== 'admin') {
        const {
          base_logistics_cost: _blc,
          delivery_spread: _ds,
          ...publicZone
        } = zone;
        return publicZone;
      }
      return zone;
    });

    return NextResponse.json({ success: true, data: zones });
  } catch (error) {
    console.error('[Admin Zones GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // MANDATORY admin guard
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = ZoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    const data = parsed.data;
    const deliverySpread =
      data.customer_delivery_fee - data.base_logistics_cost;

    const ref = db.collection('delivery_zones').doc();
    await ref.set({
      ...data,
      id: ref.id,
      delivery_spread: deliverySpread,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: ref.id, delivery_spread: deliverySpread },
        message: 'Zone created',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin Zones POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create zone' },
      { status: 500 }
    );
  }
}
