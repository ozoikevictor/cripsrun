/**
 * Admin Products API.
 * GET: List all products (admin view with stock details).
 * POST: Create a new product.
 *
 * MANDATORY: Admin role check on POST.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const ImagePathSchema = z.string().trim().refine(
  (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
  'Use a public image path like /images/photo.png or a full https image URL'
);

const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200),
  description: z.string().max(1000),
  category_id: z.string().min(1),
  product_type: z.enum(['REGULAR', 'PERISHABLE']),
  price_per_kg: z.number().int().positive(),        // Naira
  min_kg: z.number().positive(),                     // Per-product — NEVER global default
  max_kg: z.number().positive().nullable().optional(),
  kg_increment: z.number().positive().default(0.5),
  stock_kg: z.number().min(0),
  low_stock_threshold: z.number().min(0),
  image_urls: z.array(ImagePathSchema).default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

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
    const snap = await db
      .collection('products')
      .orderBy('sort_order', 'asc')
      .get();

    const products = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at:
          data.created_at?.toDate?.()?.toISOString?.() ?? null,
        updated_at:
          data.updated_at?.toDate?.()?.toISOString?.() ?? null,
      };
    });
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('[Admin Products GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
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
  const parsed = CreateProductSchema.safeParse(body);

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

    const ref = db.collection('products').doc();
    await ref.set({
      ...parsed.data,
      id: ref.id,
      sort_order: 0,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: ref.id },
        message: 'Product created',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin Products POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
