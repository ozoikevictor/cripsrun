/**
 * Revenue record writer.
 * RULE: A revenue_records document MUST be written for every successfully paid order.
 * RULE: ring_fenced_amount = service_charge exactly — earmarked for Phase 2 fleet.
 */

import type { RevenueRecordDocument } from '@/types/revenue.types';

/**
 * Write a revenue record for a paid order.
 * Idempotent — uses order_id as document ID, skips if already exists.
 */
export async function writeRevenueRecord(
  data: Omit<RevenueRecordDocument, 'id' | 'recorded_at'>
): Promise<void> {
  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');

  // Idempotent: use order_id as document ID
  const ref = db.collection('revenue_records').doc(data.order_id);
  const existing = await ref.get();

  if (existing.exists) {
    console.log(`[Revenue] Record for order ${data.order_id} already exists — skipping`);
    return;
  }

  // Enforce ring-fence rule
  if (data.ring_fenced_amount !== data.service_charge) {
    console.error(
      `[Revenue] Ring-fence mismatch for order ${data.order_id}: ` +
      `ring_fenced=${data.ring_fenced_amount}, service_charge=${data.service_charge}. ` +
      `Correcting to service_charge value.`
    );
    data.ring_fenced_amount = data.service_charge;
  }

  await ref.set({
    ...data,
    id: data.order_id,
    recorded_at: FieldValue.serverTimestamp(),
  });
}
