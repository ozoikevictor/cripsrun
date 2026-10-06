import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/admin';
import { getServerSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userRef = db.collection('users').doc(session.uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'User profile not found' },
      { status: 404 }
    );
  }

  const data = userSnap.data();

  return NextResponse.json({
    success: true,
    data: {
      uid: userSnap.id,
      full_name: data?.full_name ?? '',
      email: data?.email ?? '',
      phone: data?.phone ?? '',
      role: (data?.role as 'customer' | 'admin') ?? 'customer',
      addresses: Array.isArray(data?.addresses) ? data?.addresses : [],
      created_at:
        data?.created_at instanceof Timestamp
          ? data.created_at.toDate().toISOString()
          : data?.created_at?.toString() ?? new Date().toISOString(),
      updated_at:
        data?.updated_at instanceof Timestamp
          ? data.updated_at.toDate().toISOString()
          : data?.updated_at?.toString() ?? new Date().toISOString(),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const full_name = String(body.full_name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const addresses = Array.isArray(body.addresses) ? body.addresses : [];

  if (!full_name || !email || !phone) {
    return NextResponse.json(
      { success: false, error: 'Missing profile fields' },
      { status: 400 }
    );
  }

  const userRef = db.collection('users').doc(session.uid);
  const userSnap = await userRef.get();
  const existingData = userSnap.exists ? userSnap.data() : null;

  const now = Timestamp.now();
  const profileData = {
    uid: session.uid,
    full_name,
    email,
    phone,
    role: existingData?.role ?? 'customer',
    addresses,
    created_at: existingData?.created_at ?? now,
    updated_at: now,
  };

  await userRef.set(profileData, { merge: true });

  return NextResponse.json({
    success: true,
    data: {
      ...profileData,
      created_at:
        profileData.created_at instanceof Timestamp
          ? profileData.created_at.toDate().toISOString()
          : String(profileData.created_at),
      updated_at:
        profileData.updated_at instanceof Timestamp
          ? profileData.updated_at.toDate().toISOString()
          : String(profileData.updated_at),
    },
  });
}
