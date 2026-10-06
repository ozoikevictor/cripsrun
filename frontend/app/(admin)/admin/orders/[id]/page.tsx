'use client';

import { apiUrl } from '@/lib/api';


import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCcw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { formatCurrency, formatNaira } from '@/lib/utils/format';
import { VALID_ORDER_TRANSITIONS } from '@/types/order.types';
import type { OrderStatus } from '@/types/order.types';

type AdminOrderDetail = {
  id: string;
  order_number: string;
  status: OrderStatus;
  user_email?: string;
  user_phone?: string;
  address?: { full_address?: string; city?: string; lga?: string; instructions?: string | null };
  zone_id?: string;
  subtotal?: number;
  delivery_fee?: number;
  logistics_cost?: number;
  delivery_spread?: number;
  service_charge?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount?: number;
  delivery_date?: string | null;
  delivery_notes?: string | null;
  payment_reference?: string | null;
  payment_status?: string | null;
  payment_channel?: string | null;
  logistics_provider?: string | null;
  logistics_order_id?: string | null;
  tracking_url?: string | null;
  created_at?: string | null;
  items?: Array<{ id?: string; product_name?: string; kg_quantity?: number; price_per_kg?: number; line_total?: number }>;
  status_history?: Array<{ to_status: OrderStatus; created_at: string | null; note: string | null }>;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  PAYMENT_CONFIRMED: 'Paid',
  PROCESSING: 'Processing',
  AWAITING_PICKUP: 'Ready for Pickup',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  FAILED_DELIVERY: 'Failed Delivery',
};

const STATUS_BADGE: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING_PAYMENT: 'secondary',
  PAYMENT_CONFIRMED: 'default',
  PROCESSING: 'warning',
  AWAITING_PICKUP: 'warning',
  IN_TRANSIT: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  FAILED_DELIVERY: 'destructive',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return '-';
  return date.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDeliveryDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return '-';
  return date.toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getEffectivePaymentStatus(order: AdminOrderDetail) {
  const paidStatuses: OrderStatus[] = [
    'PAYMENT_CONFIRMED',
    'PROCESSING',
    'AWAITING_PICKUP',
    'IN_TRANSIT',
    'DELIVERED',
  ];

  if (order.payment_status === 'SUCCESS' || paidStatuses.includes(order.status)) {
    return 'SUCCESS';
  }

  return order.payment_status || 'PENDING';
}

function getLineTotal(item: NonNullable<AdminOrderDetail['items']>[number]) {
  const kgQuantity = Number(item.kg_quantity ?? 0);
  const pricePerKg = Number(item.price_per_kg ?? 0);
  const calculated = Math.round(kgQuantity * pricePerKg * 100);
  const saved = Number(item.line_total ?? 0);

  return calculated > 0 ? calculated : saved;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/admin/orders/${params.id}`), { credentials: "include" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load order');
      setOrder(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load order');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) loadOrder();
  }, [params.id, loadOrder]);

  const handleTransition = async (newStatus: OrderStatus) => {
    if (!order || !confirm(`Move order to ${STATUS_LABELS[newStatus]}?`)) return;
    setTransitioning(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/admin/orders/${order.id}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus }),
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to update status');
      await loadOrder();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update order');
    } finally {
      setTransitioning(false);
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading order...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!order) return <div className="p-6 text-muted-foreground">Order not found.</div>;

  const validNextStatuses = VALID_ORDER_TRANSITIONS[order.status] || [];
  const vatAmount = Number(order.vat_amount ?? 0);
  const vatRate = Number(order.vat_rate ?? 0);
  const logisticsCost = Number(order.logistics_cost ?? 0);
  const deliverySpread = Number(order.delivery_spread ?? 0);
  const serviceCharge = Number(order.service_charge ?? 0);
  const platformRevenue = deliverySpread + serviceCharge;

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground mt-1">{order.user_email || '-'} - Created {formatDate(order.created_at)}</p>
        </div>
        <Badge variant={STATUS_BADGE[order.status]} className="text-sm w-fit">{STATUS_LABELS[order.status]}</Badge>
      </div>

      {error && <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {validNextStatuses.length > 0 && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-sm">Admin Actions</h2>
              <div className="flex flex-wrap gap-2">
                {validNextStatuses.map((nextStatus) => (
                  <Button key={nextStatus} size="sm" variant={nextStatus === 'CANCELLED' ? 'destructive' : 'default'} onClick={() => handleTransition(nextStatus)} disabled={transitioning}>
                    {nextStatus === 'PROCESSING' && <RefreshCcw className="h-3.5 w-3.5 mr-1" />}
                    {nextStatus === 'AWAITING_PICKUP' && <Truck className="h-3.5 w-3.5 mr-1" />}
                    {nextStatus === 'PAYMENT_CONFIRMED' ? 'Mark Paid' : STATUS_LABELS[nextStatus]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Status Timeline</h2>
            <OrderTimeline
              currentStatus={order.status}
              statusHistory={(order.status_history ?? []).map((entry) => ({
                ...entry,
                created_at: entry.created_at ?? "",
              }))}
            />
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-sm">Items & Pricing</h2>
            <div className="space-y-2">
              {(order.items ?? []).map((item, index) => (
                <div key={item.id ?? index} className="flex justify-between text-sm gap-4">
                  <div>
                    <p className="font-medium">{item.product_name ?? 'Product'}</p>
                    <p className="text-xs text-muted-foreground">{item.kg_quantity ?? 0}kg x {formatNaira(Number(item.price_per_kg ?? 0))}/kg</p>
                  </div>
                  <span className="font-medium">{formatCurrency(getLineTotal(item))}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(order.subtotal ?? 0))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee</span><span>{formatCurrency(Number(order.delivery_fee ?? 0))}</span></div>
              {vatAmount > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">VAT ({vatRate}%)</span><span>{formatCurrency(vatAmount)}</span></div>
              )}
              {logisticsCost > 0 && (
                <div className="flex justify-between text-amber-600"><span>Logistics cost</span><span>-{formatCurrency(logisticsCost)}</span></div>
              )}
              {deliverySpread > 0 && (
                <div className="flex justify-between text-amber-600"><span>Delivery spread</span><span>{formatCurrency(deliverySpread)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Service charge</span><span className="text-crisp-600">{formatCurrency(serviceCharge)}</span></div>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold"><span>Total Charged</span><span>{formatCurrency(Number(order.total_amount ?? 0))}</span></div>
            {platformRevenue > 0 && (
              <div className="p-3 rounded-lg bg-crisp-50 text-xs text-crisp-700">Platform revenue: {formatCurrency(platformRevenue)} - Ring-fenced: {formatCurrency(serviceCharge)}</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-2"><h3 className="font-semibold text-sm">Customer</h3><p className="text-sm">{order.user_email || '-'}</p><p className="text-sm text-muted-foreground">{order.user_phone || '-'}</p></div>
          <div className="rounded-xl border bg-card p-5 space-y-2"><h3 className="font-semibold text-sm">Delivery</h3><p className="text-sm">{order.address?.full_address || '-'}</p><p className="text-xs text-muted-foreground">Zone: {order.zone_id || '-'} - {order.address?.lga || '-'}</p><p className="text-sm">{formatDeliveryDate(order.delivery_date)}</p>{order.delivery_notes && <p className="text-xs text-muted-foreground italic">&quot;{order.delivery_notes}&quot;</p>}</div>
          <div className="rounded-xl border bg-card p-5 space-y-2"><h3 className="font-semibold text-sm">Payment</h3><div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant={getEffectivePaymentStatus(order) === 'SUCCESS' ? 'success' : 'secondary'}>{getEffectivePaymentStatus(order) === 'SUCCESS' ? 'Paid' : getEffectivePaymentStatus(order)}</Badge></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Channel</span><span className="capitalize">{order.payment_channel || '-'}</span></div><p className="text-xs text-muted-foreground font-mono break-all">Ref: {order.payment_reference || '-'}</p></div>
          <div className="rounded-xl border bg-card p-5 space-y-2"><h3 className="font-semibold text-sm">Logistics</h3>{order.logistics_provider ? <><p className="text-sm">Provider: {order.logistics_provider}</p>{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Track Delivery</a>}</> : <p className="text-sm text-muted-foreground">Not dispatched yet</p>}</div>
        </div>
      </div>
    </div>
  );
}
