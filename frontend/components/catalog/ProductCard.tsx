'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Clock, Leaf, ArrowUpRight, PackageCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KgSelector } from '@/components/cart/KgSelector';
import { useCartStore } from '@/store/cart.store';
import { useUIStore } from '@/store/ui.store';
import { formatKg, formatNaira } from '@/lib/utils/format';
import { getProductImage } from '@/lib/products/images';
import type { ProductDocument } from '@/types/product.types';

interface ProductCardProps {
  product: ProductDocument;
}

export function ProductCard({ product }: ProductCardProps) {
  const [kg, setKg] = useState(product.min_kg);
  const [isAdded, setIsAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);

  const productImage = getProductImage(product);
  const estimatedTotal = product.price_per_kg * kg;

  const handleAddToCart = () => {
    addItem(
      product.id,
      {
        name: product.name,
        price_per_kg: product.price_per_kg,
        image_url: productImage,
        min_kg: product.min_kg,
        max_kg: product.max_kg,
        kg_increment: product.kg_increment,
        product_type: product.product_type,
        delivery_days: [],
      },
      kg
    );

    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
    }, 1500);

    openCart();
  };

  return (
    <Card
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/95 text-crisp-950 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      data-testid="product-card"
    >
      {/* Product Image */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">

          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              fill
              unoptimized
              priority={product.is_featured}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-crisp-50 to-crisp-100">
              <Leaf className="h-12 w-12 text-crisp-300" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {product.product_type === 'PERISHABLE' && (
              <Badge
                variant="warning"
                className="text-[10px]"
              >
                <Clock className="h-3 w-3 mr-1" />
                Perishable
              </Badge>
            )}

            {product.is_featured && (
              <Badge
                variant="success"
                className="text-[10px]"
              >
                Featured
              </Badge>
            )}
          </div>

          {/* Low Stock */}
          {product.stock_kg <= product.low_stock_threshold && (
            <Badge
              variant="destructive"
              className="absolute top-2 right-2 text-[10px]"
            >
              Low Stock
            </Badge>
          )}

          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full bg-background/95 px-3 py-2 text-xs font-semibold shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
            <span>View details</span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </Link>

      {/* Product Information */}
      <CardContent className="space-y-4 p-4">

        {/* Name & Price */}
        <div className="min-h-[112px]">
          <Link href={`/product/${product.slug}`}>
            <h3 className="line-clamp-2 text-base font-bold leading-tight transition-colors hover:text-primary">
              {product.name}
            </h3>
          </Link>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-primary">
              {formatNaira(product.price_per_kg)}
            </span>

            <span className="text-xs text-muted-foreground">
              /kg
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-crisp-50 px-2.5 py-1 font-medium text-primary">
              Min {formatKg(product.min_kg)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
              <PackageCheck className="h-3 w-3" />
              {formatKg(product.stock_kg)} left
            </span>
          </div>
        </div>

        {/* Kg Selector + Add To Cart */}
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Your quantity
              </p>
              <p className="text-sm font-bold">{formatNaira(estimatedTotal)}</p>
            </div>

            <KgSelector
              value={kg}
              onChange={setKg}
              minKg={product.min_kg}
              maxKg={product.max_kg}
              increment={product.kg_increment}
              compact
            />
          </div>

          <Button
            size="sm"
            className={`h-10 w-full transition-all duration-200 ${
              isAdded ? 'bg-crisp-600' : ''
            }`}
            onClick={handleAddToCart}
            data-testid="add-to-cart"
          >
            {isAdded ? (
              'Added!'
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Add
              </>
            )}
          </Button>

        </div>
      </CardContent>
    </Card>
  );
}
