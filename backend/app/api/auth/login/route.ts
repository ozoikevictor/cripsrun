import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

function firebaseLoginUrl() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error('Firebase API key is not configured');
  }

  return `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
}

function authErrorMessage(error: string | undefined) {
  switch (error) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'Invalid email or password.';
    case 'USER_DISABLED':
      return 'This account has been disabled.';
    default:
      return 'Unable to sign in right now.';
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;

  try {
    const authResponse = await fetch(firebaseLoginUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const authPayload = await authResponse.json();

    if (!authResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: authErrorMessage(authPayload.error?.message),
        },
        { status: 401 }
      );
    }

    const { db } = await import('@/lib/firebase/admin');
    const userSnap = await db.collection('users').doc(authPayload.localId).get();
    const role = userSnap.data()?.role === 'admin' ? 'admin' : 'customer';

    const response = NextResponse.json({
      success: true,
      data: {
        uid: authPayload.localId,
        email: authPayload.email,
        role,
      },
    });

    response.cookies.set('session', authPayload.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
