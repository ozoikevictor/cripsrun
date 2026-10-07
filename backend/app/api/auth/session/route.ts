import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase/admin';
import { createSessionCookie, isInvalidSession, verifySessionCookie } from '@/lib/auth/cookie';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
async function sessionData(decoded: { uid: string; email?: string }) {
  const user = await db.collection('users').doc(decoded.uid).get();
  return { uid: decoded.uid, email: decoded.email, role: user.data()?.role === 'admin' ? 'admin' : 'customer' };
}
export async function GET() {
  const token = cookies().get('session')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'No session' }, { status: 401, headers });
  try {
    const decoded = await verifySessionCookie(token);
    return NextResponse.json({ success: true, data: await sessionData(decoded) }, { headers });
  } catch (error) {
    if (isInvalidSession(error)) {
      cookies().delete('session');
      return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401, headers });
    }
    console.error('[Session API] Verification unavailable:', error);
    return NextResponse.json({ success: false, error: 'Account verification temporarily unavailable.' }, { status: 503, headers });
  }
}
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== 'string') return NextResponse.json({ success: false, error: 'Missing idToken' }, { status: 400, headers });
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!decoded.auth_time || Date.now() / 1000 - decoded.auth_time > 300) {
      return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401, headers });
    }
    const data = await sessionData(decoded);
    const token = await createSessionCookie(idToken);
    cookies().set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unable to establish account session.' }, { status: isInvalidSession(error) ? 401 : 503, headers });
  }
}
export async function DELETE() {
  cookies().delete('session');
  return NextResponse.json({ success: true, message: 'Logged out' }, { headers });
}
