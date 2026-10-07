import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const ids = [...new Set((request.nextUrl.searchParams.get('ids') || '').split(',').filter(Boolean))];
  if (!ids.length || ids.length > 100 || ids.some(id => id.includes('/'))) return NextResponse.json({ success: false }, { status: 400 });
  try {
    const data = await Promise.all(ids.map(async id => {
      const ref = db.collection('products').doc(id);
      const product = await ref.get();
      if (!product.exists) throw new Error('Product unavailable');
      const days = await ref.collection('delivery_days').get();
      return { id, name: product.data()?.name, product_type: product.data()?.product_type, days: days.docs.map(day => ({ day_of_week: day.data().day_of_week, cutoff_hours: day.data().cutoff_hours })) };
    }));
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ success: false, error: 'Unable to load delivery schedules.' }, { status: 503 }); }
}
