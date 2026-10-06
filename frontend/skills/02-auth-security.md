# Skill 02 — Authentication & Security

> Use this skill when: building auth flows, middleware, role checks, or any security-related feature.
> This is a NON-NEGOTIABLE skill — review it before implementing any protected route.

---

## Authentication Architecture

- **Firebase Authentication** handles identity (email/password + phone OTP).
- **Custom Claims** extend Firebase JWT with the `role` field (`customer` | `admin`).
- **Next.js Middleware** enforces route protection on the server before rendering.
- **API routes** validate the Firebase ID token on every request.

---

## Auth Flow

### Customer Registration
```
1. User fills form (email, phone, full_name, password)
2. createUserWithEmailAndPassword(auth, email, password)
3. Cloud Function trigger: onCreate → writes user document to Firestore
4. SMS OTP sent to phone via Termii for phone verification
5. On OTP verify: phone_verified = true in Firestore
6. User redirected to catalog
```

### Customer Login
```
1. signInWithEmailAndPassword OR phone OTP via Firebase
2. getIdToken() → send to /api/auth/session
3. API validates token → sets httpOnly cookie
4. User redirected to previous page or catalog
```

### Admin Login
```
1. signInWithEmailAndPassword (admin email only)
2. Middleware checks: role == 'admin' in custom claims
3. Access to /admin/** routes granted
4. Admin role is SET only via Firebase Admin SDK — never by client code
```

---

## Setting Admin Custom Claims

**Only run this from a server-side script or Firebase Cloud Function:**

```typescript
// scripts/set-admin-role.ts — Run locally, never expose as API
import { auth } from '@/lib/firebase/admin';

async function setAdminRole(uid: string) {
  await auth.setCustomUserClaims(uid, { role: 'admin' });
  console.log(`Admin role set for UID: ${uid}`);
}

setAdminRole('REPLACE_WITH_ADMIN_UID');
```

> **CRITICAL:** Never create an API endpoint that sets `role: 'admin'`. Claims are set manually via this script.

---

## Next.js Middleware

### `middleware.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/server';

const PUBLIC_ROUTES = ['/', '/catalog', '/product', '/login', '/register'];
const ADMIN_ROUTES = ['/admin'];
const CUSTOMER_AUTH_ROUTES = ['/checkout', '/orders', '/account', '/cart'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting headers ─────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  // Cloud Armor handles rate limiting at load balancer level
  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);

  // ── Public routes: pass through ───────────────────────────────────────────
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));
  if (isPublic) return response;

  // ── Verify token ──────────────────────────────────────────────────────────
  const token = getTokenFromRequest(request);
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ── Admin routes: require admin role ─────────────────────────────────────
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  if (isAdminRoute && decoded.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── Attach user info to headers for API routes ────────────────────────────
  response.headers.set('X-User-ID', decoded.uid);
  response.headers.set('X-User-Role', decoded.role ?? 'customer');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

### `lib/auth/server.ts`
```typescript
import { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check httpOnly cookie first (web app)
  const cookieToken = request.cookies.get('session')?.value;
  if (cookieToken) return cookieToken;

  // Fall back to Authorization header (API clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

export interface VerifiedUser extends DecodedIdToken {
  role?: 'customer' | 'admin';
}

export async function verifyToken(token: string): Promise<VerifiedUser | null> {
  try {
    const decoded = await auth.verifyIdToken(token, true); // checkRevoked = true
    return decoded as VerifiedUser;
  } catch {
    return null;
  }
}

/** Get current user from request headers (set by middleware) */
export function getUserFromRequest(request: NextRequest): {
  uid: string;
  role: string;
} | null {
  const uid = request.headers.get('X-User-ID');
  const role = request.headers.get('X-User-Role');
  if (!uid) return null;
  return { uid, role: role ?? 'customer' };
}
```

---

## API Route Auth Guards

### Standard pattern for protected API routes:
```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  // 1. Auth check
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Role check (admin only example)
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 3. Input validation (Zod)
  // ... validate request body or query params

  // 4. Business logic
  // ...

  return NextResponse.json({ success: true, data: result });
}
```

---

## Input Validation with Zod

### `lib/validators/product.schema.ts`
```typescript
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  description: z.string().max(2000),
  category_id: z.string().uuid(),
  product_type: z.enum(['REGULAR', 'PERISHABLE']),
  price_per_kg: z.number().int().positive(),  // in kobo
  min_kg: z.number().min(0.1).max(100),
  max_kg: z.number().min(0.1).max(1000).nullable(),
  kg_increment: z.number().min(0.1).max(10),
  stock_kg: z.number().min(0),
  image_urls: z.array(z.string().url()).min(1),
  tags: z.array(z.string()).default([]),
});

export const UpdateProductSchema = CreateProductSchema.partial().omit({ slug: true });
```

### `lib/validators/order.schema.ts`
```typescript
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  address_id: z.string(),
  zone_id: z.string(),
  delivery_date: z.string().datetime(),
  delivery_type: z.enum(['SINGLE', 'SPLIT']),
  delivery_notes: z.string().max(500).nullable().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    kg_quantity: z.number().positive(),
  })).min(1).max(50),
});
```

---

## Security Headers

### `next.config.js`
```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://js.paystack.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://firebasestorage.googleapis.com https://res.cloudinary.com",
      "connect-src 'self' https://*.googleapis.com https://api.paystack.co https://api.termii.com",
      "frame-src 'self' https://js.paystack.co",
    ].join('; ')
  },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

## Rate Limiting

### `lib/auth/rate-limit.ts`
```typescript
// In-memory rate limiting — use Redis/Upstash in production
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// Rate limits by endpoint type
export const RATE_LIMITS = {
  auth: { limit: 5, windowMs: 60_000 },           // 5 attempts per minute
  checkout: { limit: 3, windowMs: 60_000 },        // 3 checkouts per minute
  api: { limit: 100, windowMs: 60_000 },           // 100 requests per minute
  webhook: { limit: 200, windowMs: 60_000 },       // 200 webhook calls per minute
};
```

---

## Environment Variable Security

```typescript
// lib/env.ts — Validate all required env variables at startup
import { z } from 'zod';

const serverEnvSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string(),
  PAYSTACK_SECRET_KEY: z.string().startsWith('sk_'),
  TERMII_API_KEY: z.string(),
  RESEND_API_KEY: z.string().startsWith('re_'),
  GOOGLE_MAPS_API_KEY: z.string(),
  APP_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

export const serverEnv = serverEnvSchema.parse(process.env);

// PUBLIC env (safe for client)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().startsWith('pk_'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const clientEnv = clientEnvSchema.parse(process.env);
```

---

## Security Checklist

Before every deployment, verify:
- [ ] No `PAYSTACK_SECRET_KEY`, `FIREBASE_ADMIN_PRIVATE_KEY`, or any secret in client bundle
- [ ] `console.log` statements don't output sensitive data (orders, user PII, payment refs)
- [ ] All `fetch` calls to external APIs are made server-side only
- [ ] Firestore Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Firebase App Check enabled in Firebase console
- [ ] CORS restricted to your domain in API routes
- [ ] Paystack webhook signature verification implemented (see Skill 06)
- [ ] Rate limiting applied to `/api/auth/**` and `/api/checkout/**`
