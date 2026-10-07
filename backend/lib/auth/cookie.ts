import { auth } from '@/lib/firebase/admin';

export function createSessionCookie(idToken: string) {
  return auth.createSessionCookie(idToken, { expiresIn: 5 * 24 * 60 * 60 * 1000 });
}

export async function verifySessionCookie(token: string) {
  try { return await auth.verifySessionCookie(token, true); }
  catch (error) {
    // Accept still-valid legacy ID-token cookies during migration.
    if ((error as { code?: string }).code !== 'auth/argument-error') throw error;
    return auth.verifyIdToken(token, true);
  }
}

export function isInvalidSession(error: unknown) {
  return ['auth/argument-error', 'auth/session-cookie-expired', 'auth/session-cookie-revoked',
    'auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found',
    'auth/invalid-id-token', 'auth/invalid-session-cookie'].includes((error as { code?: string })?.code || '');
}
