/**
 * Admin Image Upload API.
 * POST: Upload product or category images to Firebase Storage.
 *
 * Accepts multipart/form-data with:
 * - file: The image file
 * - entity: 'product' | 'category'
 * - entity_id: The document ID
 *
 * MANDATORY: Admin role check before any processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { uploadToStorage } from '@/lib/storage/upload';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entity = formData.get('entity') as string;
    const entityId = formData.get('entity_id') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!entity || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entity and entity_id are required' },
        { status: 400 }
      );
    }

    if (!['product', 'category'].includes(entity)) {
      return NextResponse.json(
        { success: false, error: 'entity must be "product" or "category"' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, WebP, and AVIF images are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate storage path
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const timestamp = Date.now();
    const path = `${entity}s/${entityId}/${timestamp}.${ext}`;

    // Convert to buffer and upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToStorage(buffer, path, file.type);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Update the entity document with the new image URL
    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    const collection = entity === 'product' ? 'products' : 'categories';
    const docRef = db.collection(collection).doc(entityId);

    if (entity === 'product') {
      // Products have image_urls array — append
      await docRef.update({
        image_urls: FieldValue.arrayUnion(result.url),
        updated_at: FieldValue.serverTimestamp(),
      });
    } else {
      // Categories have single image_url
      await docRef.update({
        image_url: result.url,
        updated_at: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      data: { url: result.url, path },
      message: 'Image uploaded',
    });
  } catch (error) {
    console.error('[Admin Upload] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
