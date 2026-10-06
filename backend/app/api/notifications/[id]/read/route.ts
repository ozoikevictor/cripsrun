import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const ref = db.collection('notifications').doc(params.id);
  const snap = await ref.get();

  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  await ref.update({
    read: true,
    read_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
