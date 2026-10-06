/**
 * Pricing calculator — all values in kobo (integers).
 *
 * INTERNAL FIELDS (never exposed to customer):
 *   - logistics_cost
 *   - delivery_spread
 */

export interface PricingInput {
  subtotal: number;           // kobo — sum of all line totals
  zone: {
    customer_delivery_fee: number;    // kobo
    base_logistics_cost: number;      // kobo — INTERNAL
    service_charge: number;           // kobo — ring-fenced
  };
}

export interface OrderPricing {
  subtotal: number;
  delivery_fee: number;           // = zone.customer_delivery_fee
  logistics_cost: number;         // = zone.base_logistics_cost — INTERNAL ONLY
  delivery_spread: number;        // = delivery_fee - logistics_cost — INTERNAL ONLY
  service_charge: number;         // = zone.service_charge — ring-fenced
  vat_rate: number;               // 7.5% of subtotal
  vat_amount: number;             // subtotal * vat_rate
  total_amount: number;           // = subtotal + delivery_fee + service_charge + vat_amount
}

const VAT_RATE = 7.5;

/**
 * Calculate all pricing fields for an order.
 * All values in kobo (integers only).
 *
 * RULE: logistics_cost and delivery_spread are INTERNAL.
 *       They are stored on the order but NEVER exposed to the customer via API.
 */
export function calculateOrderPricing(input: PricingInput): OrderPricing {
  const { subtotal, zone } = input;

  const delivery_fee = zone.customer_delivery_fee;
  const logistics_cost = zone.base_logistics_cost;
  const delivery_spread = delivery_fee - logistics_cost;
  const service_charge = zone.service_charge;
  const vat_rate = VAT_RATE;
  const vat_amount = Math.round((subtotal * vat_rate) / 100);
  const total_amount = subtotal + delivery_fee + service_charge + vat_amount;

  // Validate: spread must never be negative
  if (delivery_spread < 0) {
    throw new Error(
      `PRICING ERROR: Negative delivery spread. ` +
      `Fee: ₦${delivery_fee / 100}, Cost: ₦${logistics_cost / 100}. ` +
      `Admin must fix zone pricing.`
    );
  }

  return {
    subtotal,
    delivery_fee,
    logistics_cost,
    delivery_spread,
    service_charge,
    vat_rate,
    vat_amount,
    total_amount,
  };
}
