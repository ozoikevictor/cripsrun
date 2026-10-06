'use client';

import { apiUrl } from '@/lib/api';


import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bike, Clock, Home, Loader2, MapPin, PackageCheck, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/order.types';

interface TrackingOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  delivery_date: string | null;
  address: {
    full_address: string;
    lat?: number;
    lng?: number;
  };
  logistics_provider?: string | null;
  logistics_order_id?: string | null;
  tracking_url?: string | null;
  updated_at?: string | null;
}

const STATUS_COPY: Record<OrderStatus, { label: string; message: string; progress: number }> = {
  PENDING_PAYMENT: {
    label: 'Waiting for payment',
    message: 'Tracking starts after payment is confirmed.',
    progress: 0,
  },
  PAYMENT_CONFIRMED: {
    label: 'Order confirmed',
    message: 'Your order is confirmed and waiting to be packed.',
    progress: 12,
  },
  PROCESSING: {
    label: 'Rider assigned',
    message: 'Your order is being packed. The rider will pick it up soon.',
    progress: 34,
  },
  AWAITING_PICKUP: {
    label: 'Rider heading to pickup',
    message: 'The rider is going to collect your package.',
    progress: 52,
  },
  IN_TRANSIT: {
    label: 'Rider on the way',
    message: 'Your rider is moving toward your delivery address.',
    progress: 76,
  },
  DELIVERED: {
    label: 'Delivered',
    message: 'Your order has arrived.',
    progress: 100,
  },
  CANCELLED: {
    label: 'Cancelled',
    message: 'This order was cancelled.',
    progress: 0,
  },
  FAILED_DELIVERY: {
    label: 'Delivery issue',
    message: 'The delivery could not be completed. Support will contact you.',
    progress: 88,
  },
};

function formatUpdated(value?: string | null) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTracking(showLoading = false) {
      if (!params?.id) return;
      if (showLoading) setIsLoading(true);

      try {
        const response = await fetch(apiUrl(`/api/orders/${params.id}`), {
          credentials: 'include',
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Unable to load tracking');
        }

        if (mounted) {
          setOrder(payload.data);
          setError(null);
        }
      } catch (trackingError) {
        if (mounted) {
          setError(trackingError instanceof Error ? trackingError.message : 'Unable to load tracking');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadTracking(true);
    const interval = window.setInterval(() => loadTracking(false), 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [params?.id]);

  const status = order ? STATUS_COPY[order.status] : null;
  const riderLeft = useMemo(() => `${Math.min(Math.max(status?.progress ?? 0, 6), 94)}%`, [status]);

  if (isLoading) {
    return (
      <div className="container flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">Loading rider location...</p>
        </div>
      </div>
    );
  }

  if (error || !order || !status) {
    return (
      <div className="container flex min-h-[70vh] items-center justify-center">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold">{error ?? 'Tracking not found.'}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the customer account that placed this order.
          </p>
          <Button className="mt-4" onClick={() => router.push('/orders')}>
            Back to orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-crisp-50/70 via-background to-background">
      <div className="container max-w-5xl space-y-6 py-6 md:py-8">
        <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to order
        </Link>

        <section className="grid gap-5 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[1.25fr_0.75fr] md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge variant={order.status === 'DELIVERED' ? 'success' : 'default'}>
                  {status.label}
                </Badge>
                <h1 className="mt-3 text-2xl font-bold md:text-3xl">Track your rider</h1>
                <p className="mt-1 text-sm text-muted-foreground">{order.order_number}</p>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 text-sm">
                <p className="text-muted-foreground">Updated</p>
                <p className="font-semibold">{formatUpdated(order.updated_at)}</p>
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,#e9f8ee_0%,#f8faf7_45%,#e1f1ff_100%)] p-5">
              <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full bg-white/60" />
              <div className="absolute bottom-[12%] right-[14%] h-28 w-28 rounded-full bg-white/60" />
              <div className="absolute left-[14%] right-[14%] top-1/2 h-3 -translate-y-1/2 rounded-full bg-white shadow-inner">
                <div className="h-full rounded-full bg-primary" style={{ width: riderLeft }} />
              </div>
              <div className="absolute left-[10%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                  <PackageCheck className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">CrispRun store</span>
              </div>
              <div className="absolute right-[9%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                  <Home className="h-6 w-6" />
                </span>
                <span className="max-w-36 rounded-full bg-white px-3 py-1 text-center text-xs font-semibold shadow">Your address</span>
              </div>
              <div
                className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 transition-all"
                style={{ left: riderLeft }}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-crisp-700 text-white shadow-xl ring-4 ring-white">
                  <Bike className="h-7 w-7" />
                </span>
                <span className="rounded-full bg-crisp-950 px-3 py-1 text-xs font-semibold text-white shadow">
                  Rider
                </span>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border bg-background p-4">
              <h2 className="font-semibold">{status.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
            </div>

            <div className="rounded-xl border bg-background p-4 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Delivery address</p>
                  <p className="text-sm text-muted-foreground">{order.address.full_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Estimated delivery</p>
                  <p className="text-sm text-muted-foreground">
                    {order.status === 'DELIVERED' ? 'Completed' : 'About 30-45 minutes after dispatch'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Bike className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Courier</p>
                  <p className="text-sm text-muted-foreground">
                    {order.logistics_provider ?? 'CrispRun rider'}
                    {order.logistics_order_id ? ` (${order.logistics_order_id})` : ''}
                  </p>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Phone className="mr-2 h-4 w-4" />
              Call support
            </Button>
          </aside>
        </section>
      </div>
    </div>
  );
}
