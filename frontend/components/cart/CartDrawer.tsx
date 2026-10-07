'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowRight, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CartItem } from './CartItem';
import { useCartStore } from '@/store/cart.store';
import { useUIStore } from '@/store/ui.store';
import { formatCurrency } from '@/lib/utils/format';

export function CartDrawer() {
  const isOpen = useUIStore((s) => s.isCartOpen);
  const closeCart = useUIStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out motion-reduce:animate-none" />
      <Dialog.Content className="fixed left-4 right-4 top-28 z-50 mx-auto flex max-h-[calc(100dvh-144px)] max-w-md flex-col gap-4 overflow-hidden rounded-lg border bg-background p-4 text-foreground shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:duration-150 motion-reduce:animate-none sm:left-auto sm:right-6 sm:w-[420px]">
        <SheetHeader className="shrink-0 pr-10 text-left">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'Your cart is empty'
              : `${items.length} item${items.length > 1 ? 's' : ''} in your cart`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-3 py-5">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Nothing here yet</p>
              <p className="text-sm text-muted-foreground">
                Browse our catalog to find fresh products
              </p>
            </div>
            <Link href="/catalog" onClick={closeCart}>
              <Button>
                Browse Catalog
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Item list */}
            <div className="min-h-0 max-h-[40dvh] overflow-y-auto overscroll-contain">
              <div className="divide-y">
                {items.map((item) => (
                  <CartItem key={item.product_id} item={item} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Footer */}
            <div className="shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Delivery fee and service charge calculated at checkout
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={clearCart}
                >
                  Clear
                </Button>
                <Link href="/checkout" className="flex-1" onClick={closeCart}>
                  <Button className="w-full" size="lg">
                    Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
        <Dialog.Close aria-label="Close cart" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"><X className="h-5 w-5" /></Dialog.Close>
      </Dialog.Content>
      </Dialog.Portal>
    </Sheet>
  );
}
