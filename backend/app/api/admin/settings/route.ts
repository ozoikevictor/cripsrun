import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/server';

const SettingsSchema = z.object({
  store: z.object({
    name: z.string().min(1).max(120),
    address: z.string().max(300),
    phone: z.string().max(30),
    email: z.string().email(),
    lat: z.number(),
    lng: z.number(),
  }),
  logistics: z.object({
    active_providers: z.array(z.enum(['gokada', 'uber_direct', 'bolt_food', 'glovo', 'own_fleet'])).min(1),
    default_provider: z.enum(['gokada', 'uber_direct', 'bolt_food', 'glovo', 'own_fleet']),
    fallback_enabled: z.boolean(),
    phase: z.number().int().min(1),
  }).refine((value) => value.active_providers.includes(value.default_provider), {
    message: 'Default provider must be enabled',
    path: ['default_provider'],
  }),
  notifications: z.object({
    sms_enabled: z.boolean(),
    email_enabled: z.boolean(),
    sender_id: z.string().max(11),
  }),
  pricing: z.object({
    default_service_charge: z.number().int().min(0),
    min_order_value: z.number().int().min(0),
  }),
});

const DEFAULT_SETTINGS = {
  store: {
    name: 'CrispRun',
    address: '',
    phone: '',
    email: '',
    lat: 0,
    lng: 0,
  },
  logistics: {
    active_providers: ['gokada'],
    default_provider: 'gokada',
    fallback_enabled: true,
    phase: 1,
  },
  notifications: {
    sms_enabled: true,
    email_enabled: true,
    sender_id: 'CrispRun',
  },
  pricing: {
    default_service_charge: 50000,
    min_order_value: 300000,
  },
};

async function requireAdmin(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  return user?.role === 'admin' ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const { db } = await import('@/lib/firebase/admin');
    const snapshot = await db.collection('settings').doc('platform').get();
    const saved = snapshot.exists ? snapshot.data() : undefined;
    return NextResponse.json({
      success: true,
      data: {
        ...DEFAULT_SETTINGS,
        ...saved,
        store: { ...DEFAULT_SETTINGS.store, ...saved?.store },
        logistics: { ...DEFAULT_SETTINGS.logistics, ...saved?.logistics },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...saved?.notifications },
        pricing: { ...DEFAULT_SETTINGS.pricing, ...saved?.pricing },
      },
    });
  } catch (error) {
    console.error('[Admin Settings GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const parsed = SettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid settings', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');
    const batch = db.batch();
    batch.set(db.collection('settings').doc('platform'), {
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
      updated_by: user.uid,
    });
    batch.set(db.collection('config').doc('logistics'), {
      ...parsed.data.logistics,
      updated_at: FieldValue.serverTimestamp(),
      updated_by: user.uid,
    });
    await batch.commit();
    return NextResponse.json({ success: true, data: parsed.data });
  } catch (error) {
    console.error('[Admin Settings POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}