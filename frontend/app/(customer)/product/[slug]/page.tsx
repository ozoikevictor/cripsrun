"use client";

import { apiUrl } from '@/lib/api';

import { useState, useEffect } from 'react';
import { ProductImage as Image } from '@/components/catalog/ProductImage';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Clock, Leaf, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KgSelector } from '@/components/cart/KgSelector';
import { useCartStore } from '@/store/cart.store';
import { useUIStore } from '@/store/ui.store';
import { formatCurrency, calcLineTotal, formatKg, formatNaira } from '@/lib/utils/format';
import { getProductImage } from '@/lib/products/images';
import type { ProductType } from '@/types/product.types';

// Demo product — will be fetched from Firestore by slug
const DEMO_PRODUCT = {
  id: 'prod-1',
  name: 'Premium Beef Steak',
  slug: 'premium-beef-steak',
  description:
    'Tender, marbled beef steak sourced from trusted local farms. Perfect for grilling, pan-searing, or broiling. Our beef is carefully selected for quality, with consistent marbling for maximum flavor and juiciness. Each cut is trimmed and packaged fresh for your order.',
  category_id: 'cat-beef',
  product_type: 'REGULAR' as ProductType,
  price_per_kg: 850000,
  min_kg: 0.5,
  max_kg: 10,
  kg_increment: 0.5,
  stock_kg: 50,
  low_stock_threshold: 5,
  image_urls: ['/images/premium-beef-steak.png'] as string[],
  is_active: true,
  is_featured: true,
  sort_order: 1,
  tags: ['protein', 'beef', 'grilling'],
};

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slug = params?.slug;

  useEffect(() => {
    let mounted = true;
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    fetch(apiUrl(`/api/products/${encodeURIComponent(slug)}`))
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (!json?.success) {
          setError(json?.error ?? 'Product not found');
          setProduct(null);
        } else {
          setProduct(json.data);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load product');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  const p = product ?? DEMO_PRODUCT;
  const [kg, setKg] = useState(p.min_kg);
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const notifyCartAdded = useUIStore((s) => s.notifyCartAdded);

  const lineTotal = calcLineTotal(p.price_per_kg, kg);
  const productImage = getProductImage(p);

  const handleAddToCart = () => {
    addItem(p.id, {
      name: p.name,
      price_per_kg: p.price_per_kg,
      image_url: productImage,
      min_kg: p.min_kg,
      max_kg: p.max_kg,
      kg_increment: p.kg_increment,
      product_type: p.product_type,
      delivery_days: [],
    }, kg);

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
    notifyCartAdded(p.name);
  };

  return (
    <div className="container py-8">
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading product…</div>
      ) : error ? (
        <div className="py-12 text-center text-destructive">{error}</div>
      ) : (
        <>
          {/* Back link */}
          <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
          {productImage ? (
            <Image
              src={productImage}
              alt={p.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-crisp-50 to-crisp-100">
              <Leaf className="h-24 w-24 text-crisp-200" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="flex gap-2">
            {p.product_type === 'PERISHABLE' && (
              <Badge variant="warning">
                <Clock className="h-3 w-3 mr-1" />
                Perishable
              </Badge>
            )}
            {p.is_featured && (
              <Badge variant="success">Featured</Badge>
            )}
            {p.stock_kg <= p.low_stock_threshold && (
              <Badge variant="destructive">Low Stock</Badge>
            )}
          </div>

          {/* Title & price */}
          <div>
            <h1 className="text-3xl font-bold">{p.name}</h1>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-primary">
                {formatNaira(p.price_per_kg)}
              </span>
              <span className="text-muted-foreground">/kg</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {p.description}
          </p>

          {/* Perishable delivery notice */}
          {product.product_type === 'PERISHABLE' && (
            <div
              className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800"
              data-testid="delivery-days-notice"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Limited delivery days
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  This is a perishable item and can only be delivered on
                  specific days. Available dates will be shown at checkout.
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Kg selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Select weight</span>
              <span className="text-xs text-muted-foreground">
                Min: {formatKg(p.min_kg)}
                {p.max_kg && ` · Max: ${formatKg(p.max_kg)}`}
              </span>
            </div>

            <KgSelector
              value={kg}
              onChange={setKg}
              minKg={p.min_kg}
              maxKg={p.max_kg}
              increment={p.kg_increment}
            />

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">
                  {formatKg(kg)} × {formatNaira(p.price_per_kg)}/kg
              </span>
              <span className="text-xl font-bold">
                {formatCurrency(lineTotal)}
              </span>
            </div>
          </div>

          {/* Add to cart */}
          <Button
            size="lg"
            className={`w-full text-base transition-all duration-200 ${isAdded ? 'bg-crisp-600' : ''}`}
            onClick={handleAddToCart}
          >
            {isAdded ? (
              'Added to Cart!'
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart — {formatCurrency(lineTotal)}
              </>
            )}
          </Button>

          {/* Tags */}
          {p.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {p.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        </div>
        </>
      )}
    </div>
  );
}
