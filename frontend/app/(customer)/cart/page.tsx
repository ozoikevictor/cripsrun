'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '@/components/cart/CartItem';
import { useCartStore } from '@/store/cart.store';
import { formatCurrency } from '@/lib/utils/format';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  if (items.length === 0) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground">
            Browse our catalog to find fresh products
          </p>
        </div>
        <Link href="/catalog">
          <Button size="lg">
            Browse Catalog
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1 text-sm text-crisp-100 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
          <h1 className="text-2xl font-bold">
            Your Cart ({items.length} item{items.length > 1 ? 's' : ''})
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={clearCart}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      {/* Items */}
      <div className="rounded-lg border bg-card text-card-foreground">
        <div className="divide-y px-4">
          {items.map((item) => (
            <CartItem key={item.product_id} item={item} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-lg border bg-card text-card-foreground p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">Order Summary</h2>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span className="text-xs text-muted-foreground italic">
              Calculated at checkout
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service Charge</span>
            <span className="text-xs text-muted-foreground italic">
              Calculated at checkout
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="font-semibold">Estimated Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(subtotal)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Final total including delivery fee and service charge will be shown at
          checkout after selecting your delivery address.
        </p>

        <Link href="/checkout" className="block">
          <Button className="w-full" size="lg">
            Proceed to Checkout
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
