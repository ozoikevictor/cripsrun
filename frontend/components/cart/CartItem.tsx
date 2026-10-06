'use client';

import Image from 'next/image';
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
    <div className="flex gap-3 py-3 group">
      {/* Product image */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {snap.image_url ? (
          <Image
            src={snap.image_url}
            alt={snap.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No img
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight line-clamp-2">
            {snap.name}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(item.product_id)}
            aria-label={`Remove ${snap.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatNaira(snap.price_per_kg)}/kg
        </p>

        <div className="flex items-center justify-between">
          <KgSelector
            value={item.kg_quantity}
            onChange={(kg) => updateKg(item.product_id, kg)}
            minKg={snap.min_kg}
            maxKg={snap.max_kg}
            increment={snap.kg_increment}
            compact
          />
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
