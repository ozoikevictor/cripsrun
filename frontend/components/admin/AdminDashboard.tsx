'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import { MetricCard } from '@/components/admin/MetricCard';
import { LowStockAlert } from '@/components/admin/LowStockAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { AlertCircle, ArrowRight, Loader2, PackagePlus, RefreshCw, ShoppingBag, Truck } from 'lucide-react';

interface DashboardOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string | null;
}

interface DashboardData {
  metrics: {
    today_revenue: number;
    orders_today: number;
    pending_dispatch: number;
    fleet_fund_balance: number;
    product_revenue_mtd: number;
    delivery_fees_mtd: number;
    service_charges_mtd: number;
  };
  recent_orders: DashboardOrder[];
  low_stock_products: { id: string; name: string; stock_kg: number; low_stock_threshold: number }[];
  product_count: number;
  category_count: number;
  order_count: number;
}

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/admin/dashboard'), {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to load dashboard');
      }
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(() => loadDashboard(), 30000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  if (isLoading && !data) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard data...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="m-4 flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5 md:m-6">
        <div className="flex items-center gap-2 font-semibold text-destructive">
          <AlertCircle className="h-5 w-5" /> Dashboard unavailable
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={loadDashboard} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <Badge variant="success" className="mb-3">Live data</Badge>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.order_count.toLocaleString()} orders, {data.product_count.toLocaleString()} products, and {data.category_count.toLocaleString()} categories in the database.
          </p>
          {error && <p className="mt-2 text-sm text-destructive">Refresh failed: {error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadDashboard} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/products"><PackagePlus className="h-4 w-4" /> Add products</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/orders"><ShoppingBag className="h-4 w-4" /> View orders</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Today's Revenue" value={data.metrics.today_revenue} type="currency" href="/admin/orders?date=today" />
        <MetricCard title="Orders Today" value={data.metrics.orders_today} type="number" href="/admin/orders?date=today" />
        <MetricCard title="Pending Dispatch" value={data.metrics.pending_dispatch} type="number" href="/admin/orders?status=dispatch" urgent={data.metrics.pending_dispatch > 0} />
        <MetricCard title="Fleet Fund Balance" value={data.metrics.fleet_fund_balance} type="currency" subtitle="Paid service charges" href="/admin/reports" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Product Revenue (MTD)" value={data.metrics.product_revenue_mtd} type="currency" href="/admin/reports" />
        <MetricCard title="Delivery Fees (MTD)" value={data.metrics.delivery_fees_mtd} type="currency" href="/admin/reports" />
        <MetricCard title="Service Charges (MTD)" value={data.metrics.service_charges_mtd} type="currency" href="/admin/reports" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border bg-card lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-semibold">Recent Orders</h2>
              <p className="text-xs text-muted-foreground">Latest orders from the database</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/admin/orders">Open all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          {data.recent_orders.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium text-muted-foreground">Order</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{order.order_number}</td>
                      <td className="p-3"><Badge variant="secondary">{order.status === 'AWAITING_PICKUP' ? 'READY FOR PICKUP' : order.status.replaceAll('_', ' ')}</Badge></td>
                      <td className="p-3 text-right font-medium">{formatCurrency(order.total_amount)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <LowStockAlert products={data.low_stock_products} />
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Dispatch Focus</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{data.metrics.pending_dispatch} paid orders are waiting for dispatch or preparation.</p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/admin/orders?status=dispatch">Review dispatch queue</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
