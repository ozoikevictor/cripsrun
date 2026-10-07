/**
 * Firestore order helpers.
 * Creates orders, manages status transitions via state machine.
 */

import type { OrderStatus } from '@/types/order.types';

// Re-define valid transitions here to avoid importing from types at runtime
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['AWAITING_PICKUP', 'CANCELLED'],
  AWAITING_PICKUP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED_DELIVERY'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED_DELIVERY: [],
};

/**
 * Generate a unique order number: CR-YYYYMMDD-XXXX
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000).toString();
  return `CR-${yyyy}${mm}${dd}-${rand}`;
}

/**
 * Create an order document + items sub-collection + initial status_history.
 * Returns the order document ID.
 *
 * Note: Accepts Date objects for Timestamp fields — Firestore Admin SDK converts automatically.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map(sanitizeFirestoreValue);
  }
  if (isPlainObject(value)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(value)) {
      sanitized[key] = sanitizeFirestoreValue(fieldValue);
    }
    return sanitized;
  }
  return value;
}

export async function createOrder(
  orderData: Record<string, unknown>,
  items: Record<string, unknown>[]
): Promise<string> {
  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');

  const orderRef = db.collection('orders').doc();
  const batch = db.batch();

  const sanitizedOrderData = sanitizeFirestoreValue({
    ...orderData,
    vat_rate: orderData.vat_rate ?? 0,
    vat_amount: orderData.vat_amount ?? 0,
    id: orderRef.id,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  }) as Record<string, unknown>;

  // Write order document
  batch.set(orderRef, sanitizedOrderData);

  // Write items sub-collection
  for (const item of items) {
    const itemRef = orderRef.collection('items').doc();
    const sanitizedItem = sanitizeFirestoreValue({
      ...item,
      id: itemRef.id,
      product_type: item.product_type ?? 'REGULAR',
    }) as Record<string, unknown>;
    batch.set(itemRef, sanitizedItem);
  }

  // Write initial status_history entry
  const historyRef = orderRef.collection('status_history').doc();
  batch.set(historyRef, {
    id: historyRef.id,
    from_status: null,
    to_status: 'PENDING_PAYMENT',
    changed_by: orderData.user_id,
    note: 'Order created',
    created_at: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return orderRef.id;
}

/**
 * Transition an order to a new status.
 * Validates against the state machine — throws if transition is invalid.
 * Writes a status_history sub-document on every transition.
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  changedBy: string,
  note?: string
): Promise<void> {
  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');

  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new Error(`Order ${orderId} not found`);
  }

  const currentStatus = orderSnap.data()!.status as OrderStatus;
  const validNext = VALID_STATUS_TRANSITIONS[currentStatus];

  if (!validNext || !validNext.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}. ` +
      `Valid next states: ${validNext?.join(', ') || 'none'}`
    );
  }

  const batch = db.batch();

  // Update order status
  batch.update(orderRef, {
    status: newStatus,
    updated_at: FieldValue.serverTimestamp(),
  });

  // Write status_history entry — EVERY transition gets one
  const historyRef = orderRef.collection('status_history').doc();
  batch.set(historyRef, {
    id: historyRef.id,
    from_status: currentStatus,
    to_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
    created_at: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
