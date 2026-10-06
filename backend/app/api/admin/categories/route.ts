/**
 * Admin Categories API.
 * GET: List all categories.
 * POST: Create a new category.
 *
 * MANDATORY: Admin role check before any processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().default(''),
  image_url: z.string().url().nullable().optional().default(null),
  sort_order: z.number().int().min(0).optional().default(0),
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
    const snapshot = await db
      .collection('categories')
      .orderBy('sort_order', 'asc')
      .get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('[Admin Categories] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    // Check slug uniqueness
    const existing = await db
      .collection('categories')
      .where('slug', '==', parsed.data.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: 'Category slug already exists' },
        { status: 400 }
      );
    }

    const ref = db.collection('categories').doc();
    await ref.set({
      ...parsed.data,
      id: ref.id,
      is_active: true,
      created_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, data: { id: ref.id }, message: 'Category created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin Categories] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
