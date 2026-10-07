'use client';

import { ProductImage as Image } from '@/components/catalog/ProductImage';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KgSelector } from './KgSelector';
import { formatCurrency, formatNaira } from '@/lib/utils/format';
import { useCartStore, type CartItem as CartItemType } from '@/store/cart.store';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const updateKg = useCartStore((s) => s.updateKg);
  const removeItem = useCartStore((s) => s.removeItem);
  const lineTotal = useCartStore((s) => s.getLineTotal(item.product_id));

  const { product_snapshot: snap } = item;

  return (
    <div className="flex gap-3 py-5 sm:gap-5 sm:py-6 group">
      {/* Product image */}
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {snap.image_url ? (
          <Image
            src={snap.image_url}
            alt={snap.name}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 96px, 80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No img
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm sm:text-base font-semibold leading-snug break-words">
            {snap.name}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(item.product_id)}
            aria-label={`Remove ${snap.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatNaira(snap.price_per_kg)}/kg
        </p>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <KgSelector
            value={item.kg_quantity}
            onChange={(kg) => updateKg(item.product_id, kg)}
            minKg={snap.min_kg}
            maxKg={snap.max_kg}
            increment={snap.kg_increment}
            compact
          />
          <span className="ml-auto max-w-full break-words text-right text-sm font-semibold tabular-nums">
            {formatCurrency(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
