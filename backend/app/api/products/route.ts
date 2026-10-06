import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const snap = await db.collection('products').where('is_active', '==', true).get();

    const products = snap.docs.map((doc) => {
      const d = doc.data();
      return {
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
    });

    return NextResponse.json({ success: true, data: products });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 });
  }
}
