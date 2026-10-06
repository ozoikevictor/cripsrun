/**
 * Image upload utility for Firebase Storage.
 * Generates a signed upload URL or handles server-side upload.
 *
 * Usage: Product images, category images.
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a file to Firebase Storage via the admin SDK.
 * Returns the public download URL.
 *
 * @param buffer - File buffer
 * @param path - Storage path (e.g., 'products/prod-123/image-0.webp')
 * @param contentType - MIME type
 */
export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  try {
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage().bucket();
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
    });

    // Make public
    await file.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return { success: true, url };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a file from Firebase Storage.
 */
export async function deleteFromStorage(path: string): Promise<void> {
  try {
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage().bucket();
    await bucket.file(path).delete();
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    // Don't throw — orphaned files are non-critical
  }
}

/**
 * Extract storage path from a Firebase Storage URL.
 * Used when replacing an existing image.
 */
export function getStoragePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
