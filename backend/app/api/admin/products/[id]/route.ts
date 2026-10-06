/**
 * Admin Product Detail API.
 * PUT: Update a product.
 * DELETE: Soft-delete (set is_active: false) — NEVER hard-delete.
 *
 * MANDATORY: Admin role check on all operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const ImagePathSchema = z.string().trim().refine(
  (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
  'Use a public image path like /images/photo.png or a full https image URL'
);

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(200).optional(),
  category_id: z.string().min(1).optional(),
  product_type: z.enum(['REGULAR', 'PERISHABLE']).optional(),
  description: z.string().max(1000).optional(),
  price_per_kg: z.number().int().positive().optional(),
  min_kg: z.number().positive().optional(),
  max_kg: z.number().positive().nullable().optional(),
  kg_increment: z.number().positive().optional(),
  stock_kg: z.number().min(0).optional(),
  low_stock_threshold: z.number().min(0).optional(),
  image_urls: z.array(ImagePathSchema).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  sort_order: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // MANDATORY admin guard
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = UpdateProductSchema.safeParse(body);

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

    const ref = db.collection('products').doc(params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    await ref.update({
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated',
    });
  } catch (error) {
    console.error('[Admin Product PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * Soft-delete — set is_active: false.
 * NEVER hard-delete Firestore documents.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // MANDATORY admin guard
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    const ref = db.collection('products').doc(params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Soft-delete — NEVER hard-delete
    await ref.update({
      is_active: false,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Product deactivated',
    });
  } catch (error) {
    console.error('[Admin Product DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate product' },
      { status: 500 }
    );
  }
}
