'use client';

import { apiUrl } from '@/lib/api';


import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/format';
import { Search, Eye } from 'lucide-react';
import { VALID_ORDER_TRANSITIONS } from '@/types/order.types';
import type { OrderStatus } from '@/types/order.types';

interface AdminOrderListItem {
  id: string;
  order_number: string;
  user_email: string;
  customer_name?: string;
  address: {
    full_address: string;
    city?: string;
    lga?: string;
  };
  status: OrderStatus;
  total_amount: number;
  delivery_date: string;
  created_at: string;
}

const STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending Payment', value: 'PENDING_PAYMENT' },
  { label: 'Paid', value: 'PAYMENT_CONFIRMED' },
  { label: 'Preparing', value: 'PROCESSING' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const STATUS_BADGE: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  PENDING_PAYMENT:   { label: 'Pending Payment', variant: 'secondary' },
  PAYMENT_CONFIRMED: { label: 'Paid',             variant: 'default' },
  PROCESSING:        { label: 'Preparing',        variant: 'warning' },
  AWAITING_PICKUP:   { label: 'Ready for Pickup', variant: 'warning' },
  IN_TRANSIT:        { label: 'In Transit',       variant: 'default' },
  DELIVERED:         { label: 'Delivered',        variant: 'success' },
  CANCELLED:         { label: 'Cancelled',        variant: 'destructive' },
  FAILED_DELIVERY:   { label: 'Failed Delivery',  variant: 'destructive' },
};

const formatOrderDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-NG', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const initialStatus = searchParams.get('status');
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL' | 'DISPATCH'>(
    initialStatus === 'dispatch' ? 'DISPATCH' : 'ALL'
  );
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    const params = new URLSearchParams();
    const query = searchParams.get('search') ?? '';
    if (query.trim()) {
      params.set('search', query.trim());
    }

    try {
      const endpoint = params.toString()
        ? `/api/admin/orders?${params.toString()}`
        : '/api/admin/orders';
      const response = await fetch(apiUrl(endpoint), {
        credentials: 'include',
        signal: controller.signal,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load orders');
      }

      setOrders(payload.data ?? []);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        setError('Orders are taking too long to load. Please refresh or try a smaller search.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to fetch orders');
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (!quiet) setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => fetchOrders(true), 15000);
    return () => window.clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setActiveTab(searchParams.get('status') === 'dispatch' ? 'DISPATCH' : 'ALL');
  }, [searchParams]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (
        activeTab === 'DISPATCH' &&
        !['PAYMENT_CONFIRMED', 'PROCESSING', 'AWAITING_PICKUP'].includes(order.status)
      ) {
        return false;
      }
      if (activeTab !== 'ALL' && activeTab !== 'DISPATCH' && order.status !== activeTab) return false;
      if (searchParams.get('date') === 'today') {
        const created = new Date(order.created_at);
        const now = new Date();
        if (
          Number.isNaN(created.getTime()) ||
          created.getFullYear() !== now.getFullYear() ||
          created.getMonth() !== now.getMonth() ||
          created.getDate() !== now.getDate()
        ) {
          return false;
        }
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(q) ||
        order.user_email.toLowerCase().includes(q) ||
        (order.customer_name?.toLowerCase().includes(q) ?? false) ||
        order.address.full_address.toLowerCase().includes(q)
      );
    });
  }, [orders, activeTab, search, searchParams]);

  const handleTransition = async (orderId: string, nextStatus: OrderStatus) => {
    if (!confirm(`Transition order ${orderId} to ${STATUS_BADGE[nextStatus].label}?`)) {
      return;
    }

    setUpdatingOrderId(orderId);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/admin/orders/${orderId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: nextStatus }),
        credentials: 'include',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update status');
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: nextStatus } : order
        )
      );
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all orders and update status from one admin view.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-order-search"
              className="pl-9"
              placeholder="Search order #, email, or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
            <Button variant="secondary" size="sm" onClick={() => fetchOrders()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('DISPATCH')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'DISPATCH'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Dispatch Queue
        </button>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Loading orders…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-6 text-center text-destructive">
          <p className="font-semibold">{error}</p>
          <p className="text-sm mt-2">Try refreshing or check your connection.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No orders found. Adjust your filter or refresh the page.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium text-muted-foreground">Order #</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Delivery</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="p-3 text-center font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const badge = STATUS_BADGE[order.status];
                  const nextStatuses = VALID_ORDER_TRANSITIONS[order.status] || [];

                  return (
                    <tr key={order.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{order.order_number}</td>
                      <td className="p-3 text-xs">
                        <div className="font-medium">{order.customer_name || order.user_email}</div>
                        <div className="text-muted-foreground">{order.user_email}</div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[240px] break-words">
                        {order.address.full_address || '-'}
                      </td>
                      <td className="p-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(order.total_amount)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatOrderDate(order.delivery_date)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatOrderDate(order.created_at)}</td>
                      <td className="p-3 text-center space-y-1">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {nextStatuses.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-1">
                            {nextStatuses.map((nextStatus) => (
                              <Button
                                key={nextStatus}
                                variant={nextStatus === 'CANCELLED' ? 'destructive' : 'secondary'}
                                size="sm"
                                className="min-w-[88px]"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handleTransition(order.id, nextStatus)}
                                title={`Move to ${STATUS_BADGE[nextStatus]?.label ?? nextStatus}`}
                              >
                                {nextStatus === "PAYMENT_CONFIRMED" ? "Mark Paid" : STATUS_BADGE[nextStatus]?.label ?? nextStatus}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
