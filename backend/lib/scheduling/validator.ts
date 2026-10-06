/**
 * Server-side delivery date validation.
 * ENFORCED on every checkout request — NEVER rely only on client-side checks.
 *
 * Rules:
 * 1. Regular items: any day, minimum 24h from now
 * 2. Perishable items: only days in delivery_days sub-collection
 * 3. Cutoff enforcement: must order before cutoff_hours before delivery midnight
 */

interface ItemToValidate {
  product_id: string;
  kg_quantity: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateDeliveryDate(
  items: ItemToValidate[],
  deliveryDateISO: string
): Promise<ValidationResult> {
  const { db } = await import('@/lib/firebase/admin');

  const deliveryDate = new Date(deliveryDateISO);
  const deliveryDayOfWeek = deliveryDate.getDay(); // 0=Sun, 6=Sat
  const now = new Date();

  // ── Minimum 24h lead time ─────────────────────────────────────────────────
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const selectedDay = new Date(deliveryDate);
  selectedDay.setHours(0, 0, 0, 0);

  if (selectedDay < today) {
    return {
      valid: false,
      error: 'Delivery date cannot be in the past.',
    };
  }

  // ── Validate delivery date for each PERISHABLE product ───────────────────
  for (const item of items) {
    const productSnap = await db.collection('products').doc(item.product_id).get();
    if (!productSnap.exists) {
      return { valid: false, error: `Product ${item.product_id} not found.` };
    }

    const product = productSnap.data()!;

    if (product.product_type !== 'PERISHABLE') continue;

    // Fetch allowed delivery days
    const daysSnap = await db
      .collection('products')
      .doc(item.product_id)
      .collection('delivery_days')
      .get();

    if (daysSnap.empty) {
      return {
        valid: false,
        error: `Perishable product "${product.name}" has no delivery days configured. Contact support.`,
      };
    }

    const deliveryDayDocs = daysSnap.docs.map((d) => d.data());
    const allowedDays = deliveryDayDocs.map((d) => d.day_of_week as number);

    // Check if selected delivery day is in allowed days
    if (!allowedDays.includes(deliveryDayOfWeek)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const allowedNames = allowedDays.map((d) => dayNames[d]).join(', ');
      return {
        valid: false,
        error: `"${product.name}" can only be delivered on: ${allowedNames}. You selected ${dayNames[deliveryDayOfWeek]}.`,
      };
    }

    // Check cutoff time for this specific delivery day
    const dayConfig = deliveryDayDocs.find((d) => d.day_of_week === deliveryDayOfWeek)!;
    const cutoffHours = dayConfig.cutoff_hours as number;

    // Cutoff = midnight of delivery day minus cutoff_hours
    const deliveryMidnight = new Date(deliveryDate);
    deliveryMidnight.setHours(0, 0, 0, 0);
    const cutoffTime = new Date(deliveryMidnight.getTime() - cutoffHours * 60 * 60 * 1000);

    if (now >= cutoffTime) {
      return {
        valid: false,
        error: `Orders for "${product.name}" on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][deliveryDayOfWeek]} must be placed before ${formatCutoffTime(cutoffTime)}.`,
      };
    }
  }

  return { valid: true };
}

function formatCutoffTime(date: Date): string {
  return date.toLocaleString('en-NG', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
