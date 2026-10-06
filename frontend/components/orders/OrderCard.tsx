'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { Package, MapPin, Calendar, Truck, CreditCard } from 'lucide-react';
import type { OrderStatus } from '@/types/order.types';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }
> = {
  PENDING_PAYMENT:   { label: 'Awaiting Payment',   variant: 'secondary' },
  PAYMENT_CONFIRMED: { label: 'Confirmed',           variant: 'default' },
  PROCESSING:        { label: 'Processing',          variant: 'default' },
  AWAITING_PICKUP:   { label: 'Ready for Pickup',    variant: 'warning' },
  IN_TRANSIT:        { label: 'On the Way',          variant: 'default' },
  DELIVERED:         { label: 'Delivered',           variant: 'success' },
  CANCELLED:         { label: 'Cancelled',           variant: 'destructive' },
  FAILED_DELIVERY:   { label: 'Delivery Failed',     variant: 'destructive' },
};

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    delivery_date: string;
    address: { full_address: string };
    created_at: string;
    items_count?: number;
    payment_status?: string;
    logistics_provider?: string | null;
    tracking_url?: string | null;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const statusCfg = STATUS_CONFIG[order.status];
  const createdAt = new Date(order.created_at);
  const deliveryDate = new Date(order.delivery_date);

  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <div className="rounded-xl border bg-card p-4 space-y-3 transition-all duration-200 hover:shadow-md hover:border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{order.order_number}</p>
            <p className="text-xs text-muted-foreground">
              {Number.isNaN(createdAt.getTime())
                ? 'Date unavailable'
                : createdAt.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{order.address.full_address}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>
            Delivery:{' '}
            {Number.isNaN(deliveryDate.getTime())
              ? 'Date unavailable'
              : deliveryDate.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="grid gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span>{order.items_count ?? 0} item{order.items_count === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span>{order.payment_status === 'SUCCESS' ? 'Paid' : order.payment_status ?? 'Pending'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-primary" />
            <span>{order.logistics_provider ?? 'Dispatch pending'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>
    </Link>
  );
}
