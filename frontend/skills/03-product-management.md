# Skill 03 — Product Management

> Use this skill when: building the product catalog, CRUD operations, kg selector UI,
> or configuring perishable delivery day schedules.

---

## Core Concepts

- Products are sold **by weight (kg)** — price = `price_per_kg × kg_quantity`
- `min_kg` varies per product (e.g., pepper min 0.5 kg, beef min 1 kg, yam min 2 kg)
- `PERISHABLE` products have a `delivery_days` sub-collection defining allowed delivery days
- Products are never hard-deleted — set `is_active: false`
- All prices stored in **kobo** (integer)

---

## Admin: Product CRUD

### Create Product API — `app/api/admin/products/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { CreateProductSchema } from '@/lib/validators/product.schema';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateSlug } from '@/lib/utils/slug';

export async function POST(request: NextRequest) {
  // Auth + role guard
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = CreateProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Check slug uniqueness
  const existingSlug = await db.collection('products')
    .where('slug', '==', data.slug).limit(1).get();
  if (!existingSlug.empty) {
    return NextResponse.json(
      { success: false, error: 'Slug already in use' },
      { status: 400 }
    );
  }

  const productRef = db.collection('products').doc();
  await productRef.set({
    ...data,
    id: productRef.id,
    is_active: true,
    is_featured: false,
    sort_order: 0,
    tags: data.tags ?? [],
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json(
    { success: true, data: { id: productRef.id }, message: 'Product created' },
    { status: 201 }
  );
}
```

### Configure Perishable Delivery Days — `app/api/admin/products/[id]/delivery-days/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { z } from 'zod';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const DeliveryDaySchema = z.object({
  delivery_days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),    // 0=Sun, 6=Sat
    cutoff_hours: z.number().int().min(1).max(72),  // hours before delivery day
  })).min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const product = await db.collection('products').doc(params.id).get();
  if (!product.exists) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  if (product.data()?.product_type !== 'PERISHABLE') {
    return NextResponse.json(
      { success: false, error: 'Delivery days can only be set on PERISHABLE products' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = DeliveryDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422 });
  }

  const batch = db.batch();

  // Delete existing delivery days
  const existing = await db.collection('products').doc(params.id)
    .collection('delivery_days').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  // Write new delivery days
  parsed.data.delivery_days.forEach(day => {
    const dayRef = db.collection('products').doc(params.id)
      .collection('delivery_days').doc();
    batch.set(dayRef, {
      id: dayRef.id,
      product_id: params.id,
      day_of_week: day.day_of_week,
      cutoff_hours: day.cutoff_hours,
    });
  });

  await batch.commit();

  return NextResponse.json({ success: true, message: 'Delivery days updated' });
}
```

---

## Kg Selector Component

### `components/catalog/KgSelector.tsx`
```typescript
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { formatKg, formatCurrency } from '@/lib/utils/format';

interface KgSelectorProps {
  min_kg: number;
  max_kg: number | null;
  kg_increment: number;
  price_per_kg: number;       // kobo
  onChange: (kg: number) => void;
  initialKg?: number;
}

export function KgSelector({
  min_kg,
  max_kg,
  kg_increment,
  price_per_kg,
  onChange,
  initialKg,
}: KgSelectorProps) {
  const [kg, setKg] = useState<number>(initialKg ?? min_kg);

  const updateKg = useCallback((newKg: number) => {
    const rounded = Math.round(newKg * 10) / 10;  // 1 decimal precision
    if (rounded < min_kg) return;
    if (max_kg !== null && rounded > max_kg) return;
    setKg(rounded);
    onChange(rounded);
  }, [min_kg, max_kg, onChange]);

  const decrease = () => updateKg(kg - kg_increment);
  const increase = () => updateKg(kg + kg_increment);

  const lineTotal = Math.round(kg * price_per_kg);   // in kobo

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={decrease}
          disabled={kg <= min_kg}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <span className="text-lg font-semibold min-w-[60px] text-center">
          {formatKg(kg)}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={increase}
          disabled={max_kg !== null && kg >= max_kg}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        <span>Min: {formatKg(min_kg)}</span>
        {max_kg && <span className="ml-2">Max: {formatKg(max_kg)}</span>}
      </div>

      <div className="text-base font-medium">
        Total: <span className="text-primary">{formatCurrency(lineTotal)}</span>
      </div>
    </div>
  );
}
```

### `lib/utils/format.ts`
```typescript
/** Format kobo value to Naira string */
export function formatCurrency(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

/** Format kg value for display */
export function formatKg(kg: number): string {
  return `${kg.toFixed(1)}kg`;
}

/** Calculate line total in kobo */
export function calcLineTotal(price_per_kg: number, kg: number): number {
  return Math.round(price_per_kg * kg);
}
```

---

## Product Card Component

### `components/catalog/ProductCard.tsx`
```typescript
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KgSelector } from './KgSelector';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils/format';
import type { ProductDocument } from '@/types/product.types';
import { CalendarDays, Clock } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ProductCardProps {
  product: ProductDocument;
  deliveryDays?: number[];  // Only for PERISHABLE
}

export function ProductCard({ product, deliveryDays = [] }: ProductCardProps) {
  const { addItem, isInCart, updateQuantity } = useCart();
  const [selectedKg, setSelectedKg] = useState(product.min_kg);

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      kg_quantity: selectedKg,
      product_snapshot: {
        name: product.name,
        price_per_kg: product.price_per_kg,
        image_url: product.image_urls[0],
        min_kg: product.min_kg,
        max_kg: product.max_kg,
        kg_increment: product.kg_increment,
        product_type: product.product_type,
        delivery_days: deliveryDays,
      },
    });
  };

  return (
    <div className="group rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden rounded-t-xl">
          <Image
            src={product.image_urls[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
          {product.product_type === 'PERISHABLE' && (
            <Badge variant="secondary" className="absolute top-2 left-2 gap-1">
              <Clock className="h-3 w-3" />
              Limited Days
            </Badge>
          )}
          {product.is_featured && (
            <Badge className="absolute top-2 right-2">Featured</Badge>
          )}
          {product.stock_kg < product.low_stock_threshold && (
            <Badge variant="destructive" className="absolute bottom-2 left-2">
              Low Stock
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
          <p className="text-muted-foreground text-xs">
            {formatCurrency(product.price_per_kg)}/kg
          </p>
        </div>

        {/* Perishable delivery day info */}
        {product.product_type === 'PERISHABLE' && deliveryDays.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <CalendarDays className="h-3 w-3" />
            <span>Available: {deliveryDays.map(d => DAY_NAMES[d]).join(', ')}</span>
          </div>
        )}

        <KgSelector
          min_kg={product.min_kg}
          max_kg={product.max_kg}
          kg_increment={product.kg_increment}
          price_per_kg={product.price_per_kg}
          onChange={setSelectedKg}
        />

        <Button
          className="w-full"
          onClick={handleAddToCart}
          disabled={product.stock_kg <= 0}
        >
          {product.stock_kg <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Stock Management

### Server-side stock decrement (Cloud Function — triggered on order payment)
```typescript
// functions/src/orders/on-payment-confirmed.ts
import { db } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function decrementProductStock(
  items: Array<{ product_id: string; kg_quantity: number }>
): Promise<void> {
  const batch = db.batch();

  for (const item of items) {
    const productRef = db.collection('products').doc(item.product_id);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      throw new Error(`Product ${item.product_id} not found`);
    }

    const current = productSnap.data()?.stock_kg ?? 0;
    if (current < item.kg_quantity) {
      throw new Error(`Insufficient stock for product ${item.product_id}`);
    }

    batch.update(productRef, {
      stock_kg: FieldValue.increment(-item.kg_quantity),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}
```

---

## Admin Product Form (Key Fields)

When building the admin product form, include:

```typescript
// Field configuration reference for admin UI
const PRODUCT_FORM_FIELDS = {
  basic: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', helper: 'Auto-generated from name, lowercase-dashes' },
    { name: 'description', type: 'textarea' },
    { name: 'category_id', type: 'select', source: 'categories' },
    { name: 'product_type', type: 'radio', options: ['REGULAR', 'PERISHABLE'] },
    { name: 'tags', type: 'tag-input' },
  ],
  pricing_stock: [
    { name: 'price_per_kg', type: 'currency', helper: 'Enter in Naira — stored as kobo' },
    { name: 'min_kg', type: 'number', step: 0.1, helper: 'Minimum order quantity per customer' },
    { name: 'max_kg', type: 'number', step: 0.1, nullable: true },
    { name: 'kg_increment', type: 'number', step: 0.1, helper: 'Step size for quantity selector' },
    { name: 'stock_kg', type: 'number', step: 0.1 },
    { name: 'low_stock_threshold', type: 'number' },
  ],
  // Show delivery_days section ONLY when product_type == 'PERISHABLE'
  perishable_config: [
    { name: 'delivery_days', type: 'day-picker', helper: 'Select which days this product can be delivered' },
    { name: 'cutoff_hours', type: 'number', helper: 'Hours before midnight of delivery day when orders close' },
  ],
  media: [
    { name: 'image_urls', type: 'image-upload-multi', storage: 'firebase', max: 5 },
  ],
  settings: [
    { name: 'is_active', type: 'toggle' },
    { name: 'is_featured', type: 'toggle' },
    { name: 'sort_order', type: 'number' },
  ],
};
```
