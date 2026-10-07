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
      <div className="cart-page container py-16 flex flex-col items-center justify-center text-center space-y-6">
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
    <div className="cart-page container max-w-6xl py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
          <h1 className="text-2xl font-semibold sm:text-3xl">Your cart</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} item{items.length > 1 ? 's' : ''} in your basket
          </p>
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
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Cart items" className="min-w-0 overflow-hidden rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-4 sm:px-6">
          <ShoppingBag className="cart-accent h-4 w-4" />
          <h2 className="cart-accent text-sm font-semibold">CrispRun order</h2>
          <span className="text-sm text-muted-foreground">&middot; {items.length} item{items.length > 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y px-3 sm:px-6">
          {items.map((item) => (
            <CartItem key={item.product_id} item={item} />
          ))}
        </div>
      </section>

      {/* Summary */}
      <aside aria-label="Order summary" className="min-w-0 rounded-lg border bg-card p-5 text-card-foreground space-y-5 sm:p-6 lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">Order summary</h2>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span className="text-xs text-muted-foreground italic">
              Calculated at checkout
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Service Charge</span>
            <span className="text-xs text-muted-foreground italic">
              Calculated at checkout
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold">Items total</span>
          <span className="cart-accent max-w-full break-words text-2xl font-semibold tabular-nums">
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
        <Link href="/catalog" className="block text-center text-sm text-muted-foreground transition-colors hover:text-primary">
          Continue shopping
        </Link>
      </aside>
      </div>
    </div>
  );
}
