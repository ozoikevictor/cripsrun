'use client';

import { useCartStore } from '@/store/cart.store';
import { formatCurrency, calcLineTotal } from '@/lib/utils/format';
import { Separator } from '@/components/ui/separator';

interface OrderSummaryProps {
  deliveryFeeKobo: number;
  serviceChargeKobo: number;
}

const VAT_RATE = 7.5;

export function OrderSummary({
  deliveryFeeKobo,
  serviceChargeKobo,
}: OrderSummaryProps) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const vatAmount = Math.round((subtotal * VAT_RATE) / 100 / 100) * 100;
  const total = subtotal + deliveryFeeKobo + serviceChargeKobo + vatAmount;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-base">Order Summary</h3>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.product_id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.product_snapshot.name} × {item.kg_quantity}kg
            </span>
            <span>
              {formatCurrency(
                calcLineTotal(item.product_snapshot.price_per_kg, item.kg_quantity)
              )}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Fees */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery</span>
          <span>{formatCurrency(deliveryFeeKobo)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service charge</span>
          <span>{formatCurrency(serviceChargeKobo)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-semibold text-base">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(total)}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Service charge supports platform development and delivery infrastructure.
      </p>
    </div>
  );
}
