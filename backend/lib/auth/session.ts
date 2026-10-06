/**
 * Server-side session helper.
 * Reads the session cookie, verifies the Firebase ID token, returns user info.
 * Used by Server Components and API routes (Node.js runtime only).
 */

import { cookies } from 'next/headers';

export interface SessionUser {
  uid: string;
  role: 'customer' | 'admin';
  email?: string;
}

async function getRoleFromFirestore(uid: string): Promise<'customer' | 'admin'> {
  const { db } = await import('@/lib/firebase/admin');
  const userSnap = await db.collection('users').doc(uid).get();

  if (!userSnap.exists) {
    return 'customer';
  }

  const role = String(userSnap.data()?.role ?? 'customer');
  return role === 'admin' ? 'admin' : 'customer';
}

/**
 * Get the current user session from the httpOnly session cookie.
 * Call this from Server Components or Route Handlers.
 *
 * @returns SessionUser if valid session exists, null otherwise
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) return null;

  try {
    const { auth } = await import('@/lib/firebase/admin');
    const decoded = await auth.verifyIdToken(sessionCookie);
    const role = await getRoleFromFirestore(decoded.uid);

    return {
      uid: decoded.uid,
      role,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}
