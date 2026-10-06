import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });
  }

  try {
    const snap = await db.collection('products').where('slug', '==', slug).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const doc = snap.docs[0];
    const d = doc.data();

    const product = {
      id: doc.id,
      name: d.name ?? '',
      slug: d.slug ?? '',
      description: d.description ?? '',
      category_id: d.category_id ?? null,
      product_type: d.product_type ?? 'REGULAR',
      price_per_kg: d.price_per_kg ?? 0,
      min_kg: d.min_kg ?? 0,
      max_kg: d.max_kg ?? 0,
      kg_increment: d.kg_increment ?? 0.5,
      stock_kg: d.stock_kg ?? 0,
      low_stock_threshold: d.low_stock_threshold ?? 0,
      image_urls: Array.isArray(d.image_urls) ? d.image_urls : [],
      is_active: Boolean(d.is_active),
      is_featured: Boolean(d.is_featured),
      sort_order: d.sort_order ?? 0,
      tags: Array.isArray(d.tags) ? d.tags : [],
      created_at:
        d.created_at instanceof Timestamp
          ? d.created_at.toDate().toISOString()
          : d.created_at?.toString() ?? null,
      updated_at:
        d.updated_at instanceof Timestamp
          ? d.updated_at.toDate().toISOString()
          : d.updated_at?.toString() ?? null,
    };

    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to load product' }, { status: 500 });
  }
}
