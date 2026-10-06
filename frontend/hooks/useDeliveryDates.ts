import { useCartStore } from '@/store/cart.store';

interface DeliveryDateConfig {
  canSelectAnyDay: boolean;
  allowedDaysOfWeek: number[];      // 0–6 (Sunday–Saturday)
  earliestDate: Date;
  deliveryType: 'SINGLE' | 'MUST_SPLIT' | 'CAN_SPLIT';
}

/**
 * Hook to compute delivery date constraints based on cart contents.
 * - All regular items → any day
 * - All perishable items → restricted to intersection of allowed days
 * - Mixed → CAN_SPLIT (user chooses single or split delivery)
 */
export function useDeliveryDates(): DeliveryDateConfig {
  const items = useCartStore((s) => s.items);

  const hasPerishable = items.some(
    (i) => i.product_snapshot.product_type === 'PERISHABLE'
  );
  const hasRegular = items.some(
    (i) => i.product_snapshot.product_type === 'REGULAR'
  );

  // Earliest date: today. Server-side validation still enforces perishable cutoffs.
  const earliest = new Date();
  earliest.setHours(0, 0, 0, 0);

  if (!hasPerishable) {
    return {
      canSelectAnyDay: true,
      allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      earliestDate: earliest,
      deliveryType: 'SINGLE',
    };
  }

  // Calculate intersection of delivery days across all perishable items
  const perishableItems = items.filter(
    (i) => i.product_snapshot.product_type === 'PERISHABLE'
  );

  let allowedDays: Set<number>;
  if (perishableItems[0]?.product_snapshot.delivery_days?.length) {
    allowedDays = new Set(perishableItems[0].product_snapshot.delivery_days);
    for (let i = 1; i < perishableItems.length; i++) {
      const currentDays = new Set(perishableItems[i].product_snapshot.delivery_days);
      for (const day of allowedDays) {
        if (!currentDays.has(day)) allowedDays.delete(day);
      }
    }
  } else {
    // No delivery_days configured — default to all days
    allowedDays = new Set([0, 1, 2, 3, 4, 5, 6]);
  }

  if (allowedDays.size === 0) {
    return {
      canSelectAnyDay: false,
      allowedDaysOfWeek: [],
      earliestDate: earliest,
      deliveryType: 'MUST_SPLIT',
    };
  }

  return {
    canSelectAnyDay: false,
    allowedDaysOfWeek: Array.from(allowedDays).sort(),
    earliestDate: earliest,
    deliveryType: hasRegular ? 'CAN_SPLIT' : 'SINGLE',
  };
}
