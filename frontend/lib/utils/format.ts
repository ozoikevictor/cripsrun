/**
 * Format kobo to Naira display string.
 * All monetary values in CrispRun are stored as integers in kobo.
 * ₦1 = 100 kobo.
 *
 * @example formatCurrency(250000) → "₦2,500"
 * @example formatCurrency(75000)  → "₦750"
 * @example formatCurrency(0)      → "₦0"
 */
export function formatCurrency(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
}

/**
 * Calculate line total for a cart item.
 * Product price is stored as Naira; result is returned in kobo.
 *
 * @example calcLineTotal(25000, 1.5) → 3750000 (₦25,000/kg × 1.5kg = ₦37,500)
 */
export function calcLineTotal(pricePerKg: number, kgQuantity: number): number {
  return Math.round(pricePerKg * kgQuantity * 100);
}

export function formatNaira(naira: number): string {
  return formatCurrency(Math.round(naira * 100));
}

/**
 * Format weight in kilograms for display.
 *
 * @example formatKg(1.5) → "1.5 kg"
 * @example formatKg(2)   → "2 kg"
 */
export function formatKg(kg: number): string {
  return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)} kg`;
}

/**
 * Generate a human-readable order number.
 *
 * @example "CR-20240115-4821"
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CR-${dateStr}-${random}`;
}
