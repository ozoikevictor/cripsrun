/**
 * Server-side auth helpers.
 * Used in API route handlers (Node.js runtime), NOT in middleware (Edge runtime).
 */

export interface VerifiedUser {
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
 * Extract the auth token from request headers.
 */
export function getTokenFromHeaders(headers: Headers): string | null {
  // Check Authorization header
  const authHeader = headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie header for session token
  const cookies = headers.get('cookie') ?? '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  if (sessionMatch) return sessionMatch[1];

  return null;
}

/**
 * Verify a Firebase ID token server-side.
 * Only call this from API route handlers (Node.js runtime).
 */
export async function verifyToken(
  token: string
): Promise<VerifiedUser | null> {
  try {
    const { auth } = await import('@/lib/firebase/admin');
    const decoded = await auth.verifyIdToken(token);
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

/**
 * Authenticate a request in an API route handler.
 * Returns the verified user or null.
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const user = await authenticateRequest(request.headers);
 *   if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
 *   if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
 * }
 */
export async function authenticateRequest(
  headers: Headers
): Promise<VerifiedUser | null> {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  return verifyToken(token);
}
