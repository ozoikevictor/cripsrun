'use client';

import { apiUrl } from '@/lib/api';


import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Truck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { formatCurrency, formatNaira } from '@/lib/utils/format';
import type { OrderStatus } from '@/types/order.types';

interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  service_charge: number;
  vat_rate: number;
  vat_amount: number;
  delivery_date: string;
  delivery_notes?: string | null;
  address: {
    full_address: string;
    city?: string;
    lga?: string;
  };
  created_at: string;
  payment_status: string;
  payment_channel?: string | null;
  payment_reference?: string | null;
  logistics_provider?: string | null;
  logistics_order_id?: string | null;
  tracking_url?: string | null;
  items: Array<{
    product_name: string;
    kg_quantity: number;
    price_per_kg: number;
    line_total: number;
  }>;
  status_history: Array<{
    id: string;
    from_status: OrderStatus | null;
    to_status: OrderStatus;
    note: string | null;
    created_at: string;
  }>;
}

const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED'];
const LIVE_TRACKING_STATUSES: OrderStatus[] = ['PAYMENT_CONFIRMED', 'PROCESSING', 'AWAITING_PICKUP', 'IN_TRANSIT'];

function formatOrderDate(value?: string | null) {
  if (!value) return 'date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return 'date unavailable';
  }

  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadOrder(showLoading = true) {
      if (!params?.id) {
        setError('Invalid order ID');
        setIsLoading(false);
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const res = await fetch(apiUrl(`/api/orders/${params.id}`), { credentials: 'include' });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload.error || 'Unable to load order');
        }
        if (!mounted) return;
        setOrder({
          ...payload.data,
          status_history: Array.isArray(payload.data.status_history)
            ? payload.data.status_history.map((entry: any) => ({
                ...entry,
                created_at: entry.created_at ?? '',
              }))
            : [],
        });
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load order');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();
    const interval = window.setInterval(() => {
      setOrder((current) => {
        if (current && LIVE_TRACKING_STATUSES.includes(current.status)) {
          loadOrder(false);
        }
        return current;
      });
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [params?.id]);

  useEffect(() => {
    async function verifyPayment() {
      const paymentMode = searchParams.get('payment');
      const paramReference = searchParams.get('reference');
      const reference = paramReference ?? order?.payment_reference;

      if (hasVerified || paymentMode !== 'success' || !order) return;

      if (order.payment_status === 'SUCCESS') {
        setPaymentStatus('success');
        setPaymentMessage('Payment confirmed. Your order is now being processed.');
        setHasVerified(true);
        return;
      }

      if (!reference) return;

      setPaymentStatus('verifying');
      setPaymentMessage(null);

      try {
        const res = await fetch(apiUrl(`/api/payments/verify/${encodeURIComponent(reference)}`), {
          credentials: 'include',
        });
        const payload = await res.json();

        if (!res.ok || !payload.success) {
          setPaymentStatus((current) =>
            order.payment_status === 'SUCCESS' ? 'success' : current
          );
          setPaymentMessage(
            order.payment_status === 'SUCCESS'
              ? 'Payment confirmed. Your order is now being processed.'
              : payload.error || 'Payment verification failed.'
          );
          if (order.payment_status !== 'SUCCESS') {
            setPaymentStatus('failed');
          }
          return;
        }

        setPaymentStatus('success');
        setPaymentMessage('Payment confirmed. Your order is now being processed.');

        setOrder((current) =>
          current
            ? {
                ...current,
                status: payload.data.order_status ?? current.status,
                payment_status: payload.data.payment_status ?? current.payment_status,
              }
            : current
        );
      } catch (err: unknown) {
        setPaymentStatus('failed');
        setPaymentMessage(err instanceof Error ? err.message : 'Payment verification failed.');
      } finally {
        setHasVerified(true);
      }
    }

    verifyPayment();
  }, [searchParams, hasVerified, order]);

  const handleCancel = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(apiUrl(`/api/orders/${order.id}/cancel`), {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to cancel order');
      }

      setOrder((current) =>
        current ? { ...current, status: 'CANCELLED' } : current
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-16 text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
        <p className="text-lg font-medium">Loading order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-lg font-medium">{error ?? 'Order not found.'}</p>
        <Button onClick={() => router.push('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const isLiveDelivery = LIVE_TRACKING_STATUSES.includes(order.status);
  const trackingStage =
    order.status === 'IN_TRANSIT'
      ? 'Your rider is on the way to your house.'
      : order.status === 'AWAITING_PICKUP'
      ? 'Your order is ready and waiting for rider pickup.'
      : order.status === 'PROCESSING'
      ? 'Your order is being packed for dispatch.'
      : order.status === 'DELIVERED'
      ? 'Your order has arrived.'
      : 'Tracking starts after your order is confirmed.';

  return (
    <div className="container py-8 max-w-3xl">
      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {paymentStatus !== 'idle' && (
        <div
          className={`rounded-xl border p-4 mb-6 text-sm ${
            paymentStatus === 'verifying'
              ? 'border-muted bg-muted/5 text-foreground'
              : paymentStatus === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-destructive bg-destructive/10 text-destructive'
          }`}
        >
          {paymentStatus === 'verifying'
            ? 'Verifying payment, please wait...'
            : paymentMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {formatOrderDate(order.created_at)}
          </p>
        </div>
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <XCircle className="h-4 w-4 mr-1" />
            )}
            Cancel Order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline (main) */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold mb-4">Order Status</h2>
            <OrderTimeline
              currentStatus={order.status}
              statusHistory={order.status_history}
            />
          </div>

          {/* Items */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Items</h2>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.kg_quantity}kg × {formatNaira(item.price_per_kg)}/kg
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.line_total)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service charge</span>
                <span>{formatCurrency(order.service_charge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT ({order.vat_rate}%)</span>
                <span>{formatCurrency(order.vat_amount)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">Live Delivery Tracking</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep this page open on your phone for delivery updates.
                </p>
              </div>
              {isLiveDelivery ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crisp-100 text-primary">
                  <Navigation className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Truck className="h-4 w-4" />
                </span>
              )}
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-sm font-medium">{trackingStage}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This page checks for new delivery updates every 30 seconds.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[5rem_1fr] items-start gap-3">
                <span className="text-muted-foreground">Courier</span>
                <span className="min-w-0 text-right font-medium leading-snug">
                  {order.logistics_provider ?? 'Not assigned yet'}
                </span>
              </div>
              <div className="grid grid-cols-[5rem_1fr] items-start gap-3">
                <span className="text-muted-foreground">Tracking</span>
                <span className="min-w-0 text-right font-medium leading-snug">
                  {order.tracking_url ? 'Available' : 'Waiting for dispatch'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href={order.tracking_url ?? `/track/${order.id}`}>
                  Open rider map
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!order.tracking_url && (
                <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh tracking
                </Button>
              )}
            </div>
          </div>

          {/* Delivery info */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm">Delivery Details</h3>

            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>{order.address.full_address}</span>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>
                {new Date(order.delivery_date).toLocaleDateString('en-NG', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {order.delivery_notes && (
              <p className="text-xs text-muted-foreground italic">
                &ldquo;{order.delivery_notes}&rdquo;
              </p>
            )}
          </div>

          {/* Payment info */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm">Payment</h3>
            <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="flex justify-end">
                <Badge variant={order.payment_status === 'SUCCESS' ? 'success' : 'secondary'}>
                  {order.payment_status === 'SUCCESS' ? 'Paid' : order.payment_status}
                </Badge>
              </span>
            </div>
            {order.payment_channel && (
              <div className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="text-right capitalize">{order.payment_channel}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm">Dispatch</h3>
            <div className="grid grid-cols-[5rem_1fr] items-start gap-3 text-sm">
              <span className="text-muted-foreground">Provider</span>
              <span className="text-right leading-snug">{order.logistics_provider ?? 'Not dispatched yet'}</span>
            </div>
            {order.tracking_url ? (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open tracking link
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tracking appears here once admin dispatches the order.
              </p>
            )}
          </div>

          {/* Support */}
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <h3 className="font-semibold text-sm">Need Help?</h3>
            <p className="text-xs text-muted-foreground">
              Contact us about this order
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Phone className="h-3.5 w-3.5 mr-1" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
