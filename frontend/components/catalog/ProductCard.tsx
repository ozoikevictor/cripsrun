'use client';

import { useState } from 'react';
import { ProductImage as Image } from './ProductImage';
import Link from 'next/link';
import { ShoppingCart, Clock, Leaf, ArrowUpRight } from 'lucide-react';

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
      className="group min-w-0 overflow-hidden rounded-lg border border-white/15 bg-white/95 text-crisp-950 shadow-none transition-colors hover:border-crisp-300"
      data-testid="product-card"
    >
      {/* Product Image */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">

          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-crisp-50 to-crisp-100">
              <Leaf className="h-12 w-12 text-crisp-300" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-1 left-1 flex flex-col items-start gap-1">
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
              className="absolute bottom-1 right-1 text-[10px]"
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
      <CardContent className="space-y-2 p-2 sm:p-3">

        {/* Name & Price */}
        <div className="min-w-0">
          <Link href={`/product/${product.slug}`}>
            <h3 className="min-h-10 line-clamp-2 break-words text-sm font-semibold leading-5 transition-colors hover:text-primary">
              {product.name}
            </h3>
          </Link>


          <div className="mt-1 flex flex-wrap items-baseline gap-1">
            <span className="text-sm font-bold text-crisp-700 sm:text-base">
              {formatNaira(product.price_per_kg)}
            </span>

            <span className="text-xs text-crisp-800">
              /kg
            </span>
          </div>

          <div className="mt-1 text-xs text-crisp-800">
            <span>
              Min {formatKg(product.min_kg)}
            </span>
          </div>
        </div>

        {/* Kg Selector + Add To Cart */}
        <div className="border-t border-crisp-950/10 pt-2">
          <div className="mb-2 flex flex-col items-start gap-2">
            <div>
              <p className="text-xs font-medium text-crisp-800">
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
