import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';

function toIsoString(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') {
      try {
        const date = toDate.call(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    }
  }

  if (value && typeof value === 'object') {
    const timestamp = value as { _seconds?: unknown; seconds?: unknown };
    const seconds = typeof timestamp._seconds === 'number'
      ? timestamp._seconds
      : typeof timestamp.seconds === 'number'
        ? timestamp.seconds
        : null;
    if (seconds !== null) {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/lib/firebase/admin');
  const snapshot = await db
    .collection('notifications')
    .where('user_id', '==', user.uid)
    .get();

  const notifications = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? 'Notification',
        message: data.message ?? '',
        read: Boolean(data.read),
        order_id: data.order_id ?? null,
        order_number: data.order_number ?? null,
        type: data.type ?? null,
        status: data.status ?? null,
        created_at: toIsoString(data.created_at),
      };
    })
    .sort((a, b) => (Date.parse(b.created_at ?? '') || 0) - (Date.parse(a.created_at ?? '') || 0));

  return NextResponse.json({
    success: true,
    data: notifications.slice(0, 20),
    unread_count: notifications.filter((notification) => !notification.read).length,
  });
}
