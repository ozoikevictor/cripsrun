import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { getServerSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (Number(request.headers.get('content-length')) > 220000) return NextResponse.json({ error: 'Picture is too large.' }, { status: 413 });
  try {
    const { photo } = await request.json();
    if (photo !== null && (typeof photo !== 'string' || photo.length > 200000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) {
      return NextResponse.json({ error: 'Please select a valid picture.' }, { status: 400 });
    }
    if (photo !== null) {
      const bytes = Buffer.from(photo.split(',')[1], 'base64');
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) {
        return NextResponse.json({ error: 'Invalid JPEG picture.' }, { status: 400 });
      }
    }
    await db.collection('users').doc(session.uid).set({ photo_url: photo }, { merge: true });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to save picture. Please try again.' }, { status: 500 });
  }
}
