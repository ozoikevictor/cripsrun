/**
 * Session API — manages httpOnly session cookie.
 * POST: Set session cookie from Firebase ID token.
 * DELETE: Clear session cookie (logout).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface DecodedSessionToken {
  uid: string;
  email?: string;
}

function isNetworkPermissionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('EACCES') || message.includes('UNAVAILABLE');
}

function decodeTokenForLocalDev(idToken: string): DecodedSessionToken {
  const [, payload] = idToken.split('.');

  if (!payload) {
    throw new Error('Invalid Firebase token payload');
  }

  const decoded = JSON.parse(
    Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  );

  if (!decoded.sub || typeof decoded.sub !== 'string') {
    throw new Error('Invalid Firebase token subject');
  }

  return {
    uid: decoded.sub,
    email: typeof decoded.email === 'string' ? decoded.email : undefined,
  };
}

async function verifySessionToken(idToken: string): Promise<DecodedSessionToken> {
  try {
    const { auth } = await import('@/lib/firebase/admin');
    const decoded = await auth.verifyIdToken(idToken);

    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && isNetworkPermissionError(error)) {
      console.warn(
        '[Session API] Firebase Admin verification unavailable locally; using development-only token decode.'
      );
      return decodeTokenForLocalDev(idToken);
    }

    throw error;
  }
}

async function getRoleFromFirestore(uid: string): Promise<'customer' | 'admin'> {
  try {
    const { db } = await import('@/lib/firebase/admin');
    const userSnap = await db.collection('users').doc(uid).get();

    if (!userSnap.exists) {
      return 'customer';
    }

    const role = String(userSnap.data()?.role ?? 'customer');
    return role === 'admin' ? 'admin' : 'customer';
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && isNetworkPermissionError(error)) {
      console.warn(
        '[Session API] Firestore role lookup unavailable locally; defaulting to customer role.'
      );
      return 'customer';
    }

    throw error;
  }
}

export async function GET() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ success: false, error: 'No session' }, { status: 401 });
  }

  try {
    const decoded = await verifySessionToken(sessionToken);
    const role = await getRoleFromFirestore(decoded.uid);

    return NextResponse.json({
      success: true,
      data: {
        uid: decoded.uid,
        role,
        email: decoded.email,
      },
    });
  } catch (error) {
    console.error('[Session API] Invalid session:', error);
    const cookieStore = cookies();
    cookieStore.delete('session');
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing idToken' },
        { status: 400 }
      );
    }

    // Verify the token with Firebase Admin
    const decoded = await verifySessionToken(idToken);
    const role = await getRoleFromFirestore(decoded.uid);

    // Authentication lasts for the current browser session.
    const cookieStore = cookies();
    cookieStore.set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({
      success: true,
      data: {
        uid: decoded.uid,
        role,
        email: decoded.email,
      },
    });
  } catch (error) {
    console.error('[Session API] Error setting session:', error);
    const message =
      error instanceof Error ? error.message : 'Unable to verify Firebase token';
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? message
            : 'Invalid token',
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete('session');

  return NextResponse.json({ success: true, message: 'Logged out' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
