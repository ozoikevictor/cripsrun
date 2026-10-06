import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function firebaseAuthUrl(action: 'signUp' | 'signInWithPassword') {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error('Firebase API key is not configured');
  }

  return `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${apiKey}`;
}

function authErrorMessage(error: string | undefined) {
  switch (error) {
    case 'EMAIL_EXISTS':
      return 'An account already exists with this email.';
    case 'INVALID_EMAIL':
      return 'Please enter a valid email address.';
    case 'WEAK_PASSWORD : Password should be at least 6 characters':
      return 'Password must be at least 6 characters.';
    default:
      return 'Unable to create account right now.';
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { fullName, email, phone, password } = parsed.data;

  try {
    const authResponse = await fetch(firebaseAuthUrl('signUp'), {
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
        { status: 400 }
      );
    }

    const { db } = await import('@/lib/firebase/admin');
    await db.collection('users').doc(authPayload.localId).set(
      {
        email,
        full_name: fullName,
        phone,
        role: 'customer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      { merge: true }
    );

    const response = NextResponse.json(
      {
        success: true,
        data: {
          uid: authPayload.localId,
          email,
          role: 'customer',
        },
      },
      { status: 201 }
    );

    response.cookies.set('session', authPayload.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 14,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Register API] Error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
