'use client';

import { apiUrl } from '@/lib/api';


import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/components/orders/OrderCard';
import type { OrderStatus } from '@/types/order.types';

interface CustomerOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  delivery_date: string;
  address: { full_address: string };
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function fetchOrders() {
      try {
        const res = await fetch(apiUrl('/api/orders'), { credentials: 'include' });
        const payload = await res.json();

        if (res.status === 401) {
          router.replace('/login?from=/orders');
          return;
        }

        if (!res.ok || !payload.success) {
          throw new Error(payload.error || 'Unable to load orders');
        }

        if (active) setOrders(payload.data);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load orders');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchOrders();
    const interval = window.setInterval(fetchOrders, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg font-medium">Loading your orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg font-medium">{error}</p>
        <p className="text-sm text-muted-foreground mt-2">
          If this keeps happening, try signing out and signing back in.
        </p>
        <Link href="/catalog">
          <Button className="mt-4">Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* =========================
          HERO / ORDERS HEADER
      ========================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-crisp-50 via-white to-crisp-100 dark:from-crisp-950 dark:via-background dark:to-crisp-900">

        <div className="container py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">

            {/* LEFT SIDE */}
            <div className="space-y-5">

              <div className="inline-flex items-center gap-2 rounded-full bg-crisp-100 px-4 py-2 text-sm font-medium text-crisp-800 dark:bg-crisp-900 dark:text-crisp-200">
                <Package className="h-4 w-4" />
                Your Orders
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Track your{' '}
                <span className="text-gradient">
                  fresh food orders
                </span>
              </h1>

              <p className="max-w-lg text-muted-foreground text-base md:text-lg">
                View your orders, check delivery status, and keep track of
                everything you&apos;ve ordered from CrispRun.
              </p>

              <Link href="/catalog">
                <Button size="lg" className="shadow-lg shadow-primary/25">
                  Continue Shopping
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

            </div>

            {/* RIGHT SIDE - HERO IMAGE */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-crisp-100 shadow-xl">
                <Image
                  src="/images/premium-beef-steak.png"
                  alt="Fresh premium beef steak"
                  fill
                  priority
                  className="object-contain p-8"
                  sizes="(max-width: 768px) 100vw, 450px"
                />
              </div>

              {/* Floating card */}
              <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-4 shadow-xl dark:bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-crisp-100 text-crisp-700">
                    <Package className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Fresh delivery
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Always tracked
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================
          ORDERS
      ========================== */}
      {orders.length === 0 ? (
        <div className="container py-16 flex flex-col items-center justify-center text-center space-y-6">

          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              No orders yet
            </h2>

            <p className="text-muted-foreground">
              Place your first order to get fresh food delivered to you.
            </p>
          </div>

          <Link href="/catalog">
            <Button size="lg">
              Start Shopping
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

        </div>
      ) : (
        <section className="container py-10 max-w-3xl">

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              My Orders
            </h2>

            <p className="text-muted-foreground mt-1">
              View and track your recent orders.
            </p>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
              />
            ))}
          </div>

        </section>
      )}

    </div>
  );
}
