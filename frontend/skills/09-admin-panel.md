# Skill 09 — Admin Panel

> Use this skill when: building any admin dashboard page, metric cards, data tables,
> product/order management UI, zone management, or the revenue report.

---

## Admin Dashboard — Metrics Overview

### `app/(admin)/dashboard/page.tsx`
```typescript
import { db } from '@/lib/firebase/admin';
import { MetricCard } from '@/components/admin/MetricCard';
import { RecentOrdersTable } from '@/components/admin/RecentOrdersTable';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { LowStockAlert } from '@/components/admin/LowStockAlert';
import { getDashboardMetrics } from '@/lib/admin/metrics';

export default async function AdminDashboard() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Revenue"
          value={metrics.todayRevenue}
          type="currency"
          change={metrics.todayRevenueChange}
        />
        <MetricCard
          title="Orders Today"
          value={metrics.ordersToday}
          type="number"
          change={metrics.ordersTodayChange}
        />
        <MetricCard
          title="Pending Dispatch"
          value={metrics.pendingDispatch}
          type="number"
          urgent={metrics.pendingDispatch > 5}
        />
        <MetricCard
          title="Fleet Fund Balance"
          value={metrics.ringFencedTotal}
          type="currency"
          subtitle="Ring-fenced service charges"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Delivery Spread (MTD)" value={metrics.mtdDeliverySpread} type="currency" />
        <MetricCard title="Service Charges (MTD)" value={metrics.mtdServiceCharge} type="currency" />
        <MetricCard title="Product Revenue (MTD)" value={metrics.mtdSubtotal} type="currency" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart — 30-day trend */}
        <div className="lg:col-span-2">
          <RevenueChart data={metrics.dailyRevenue} />
        </div>

        {/* Low stock alerts */}
        <div>
          <LowStockAlert products={metrics.lowStockProducts} />
        </div>
      </div>

      {/* Recent orders needing action */}
      <RecentOrdersTable orders={metrics.recentOrders} />
    </div>
  );
}
```

### `lib/admin/metrics.ts`
```typescript
import { db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function getDashboardMetrics() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yesterday = new Date(todayStart); yesterday.setDate(yesterday.getDate() - 1);

  const [
    todayOrders,
    yesterdayOrders,
    pendingDispatch,
    mtdRevenue,
    lowStock,
    recentOrders,
    dailyRevenue,
    ringFencedTotal,
  ] = await Promise.all([
    // Today's paid orders
    db.collection('revenue_records')
      .where('recorded_at', '>=', Timestamp.fromDate(todayStart))
      .get(),

    // Yesterday's paid orders (for % change)
    db.collection('revenue_records')
      .where('recorded_at', '>=', Timestamp.fromDate(yesterday))
      .where('recorded_at', '<', Timestamp.fromDate(todayStart))
      .get(),

    // Orders needing dispatch
    db.collection('orders')
      .where('status', '==', 'PAYMENT_CONFIRMED')
      .get(),

    // Month-to-date revenue records
    db.collection('revenue_records')
      .where('recorded_at', '>=', Timestamp.fromDate(monthStart))
      .get(),

    // Low stock products
    db.collection('products')
      .where('is_active', '==', true)
      .get(),

    // Recent orders (last 20, any status)
    db.collection('orders')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get(),

    // Last 30 days daily revenue
    db.collection('revenue_records')
      .where('recorded_at', '>=', Timestamp.fromDate(new Date(now.setDate(now.getDate() - 30))))
      .orderBy('recorded_at', 'asc')
      .get(),

    // All-time ring-fenced total
    db.collection('revenue_records').get(),
  ]);

  const sumRevenue = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
    docs.reduce((sum, d) => {
      const data = d.data();
      return sum + (data.subtotal ?? 0) + (data.delivery_spread ?? 0) + (data.service_charge ?? 0);
    }, 0);

  const todayRev = sumRevenue(todayOrders.docs);
  const yesterdayRev = sumRevenue(yesterdayOrders.docs);
  const revenueChange = yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : 0;

  const mtdDocs = mtdRevenue.docs.map(d => d.data());

  // Low stock filter
  const lowStockProducts = lowStock.docs
    .map(d => d.data())
    .filter(p => p.stock_kg <= p.low_stock_threshold);

  // Ring-fenced total (all-time service charges)
  const ringFenced = ringFencedTotal.docs.reduce(
    (sum, d) => sum + (d.data().ring_fenced_amount ?? 0), 0
  );

  // Build daily revenue map for chart (last 30 days)
  const dailyMap: Record<string, number> = {};
  dailyRevenue.docs.forEach(doc => {
    const d = doc.data();
    const dateKey = d.recorded_at.toDate().toISOString().slice(0, 10);
    dailyMap[dateKey] = (dailyMap[dateKey] ?? 0) + (d.total_platform_revenue ?? 0);
  });

  return {
    todayRevenue: todayRev,
    todayRevenueChange: revenueChange,
    ordersToday: todayOrders.size,
    ordersTodayChange: yesterdayOrders.size > 0
      ? ((todayOrders.size - yesterdayOrders.size) / yesterdayOrders.size) * 100 : 0,
    pendingDispatch: pendingDispatch.size,
    ringFencedTotal: ringFenced,
    mtdSubtotal: mtdDocs.reduce((s, d) => s + (d.subtotal ?? 0), 0),
    mtdDeliverySpread: mtdDocs.reduce((s, d) => s + (d.delivery_spread ?? 0), 0),
    mtdServiceCharge: mtdDocs.reduce((s, d) => s + (d.service_charge ?? 0), 0),
    lowStockProducts,
    recentOrders: recentOrders.docs.map(d => d.data()),
    dailyRevenue: Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })),
  };
}
```

---

## MetricCard Component

### `components/admin/MetricCard.tsx`
```typescript
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  type: 'currency' | 'number';
  change?: number;        // % change (positive = up, negative = down)
  subtitle?: string;
  urgent?: boolean;
}

export function MetricCard({ title, value, type, change, subtitle, urgent }: MetricCardProps) {
  const displayValue = type === 'currency' ? formatCurrency(value) : value.toLocaleString();

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-2',
      urgent && 'border-orange-400 bg-orange-50 dark:bg-orange-950'
    )}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{displayValue}</p>

      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs',
          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {change > 0 ? <TrendingUp className="h-3 w-3" />
            : change < 0 ? <TrendingDown className="h-3 w-3" />
            : <Minus className="h-3 w-3" />}
          <span>{Math.abs(change).toFixed(1)}% vs yesterday</span>
        </div>
      )}

      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
```

---

## Admin Data Table (Reusable)

### `components/admin/DataTable.tsx`
```typescript
'use client';

import {
  useReactTable, getCoreRowModel, getPaginationRowModel,
  getSortedRowModel, getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumn?: string;
}

export function DataTable<TData, TValue>({
  columns, data, searchPlaceholder = 'Search...', searchColumn,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-3">
      {searchColumn && (
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} total rows
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Admin Navigation Layout

### `app/(admin)/layout.tsx`
```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session || session.role !== 'admin') {
    redirect('/login?from=/admin/dashboard');
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar adminName={session.name} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Admin Sidebar Nav Items
```typescript
// components/admin/AdminSidebar.tsx — nav items reference
const NAV_ITEMS = [
  { label: 'Dashboard',   href: '/admin/dashboard',   icon: 'LayoutDashboard' },
  { label: 'Orders',      href: '/admin/orders',       icon: 'ShoppingBag',    badge: 'pendingDispatch' },
  { label: 'Products',    href: '/admin/products',     icon: 'Package' },
  { label: 'Categories',  href: '/admin/categories',   icon: 'Tag' },
  { label: 'Zones',       href: '/admin/zones',        icon: 'MapPin' },
  { label: 'Pricing',     href: '/admin/pricing',      icon: 'DollarSign' },
  { label: 'Logistics',   href: '/admin/logistics',    icon: 'Truck' },
  { label: 'Revenue',     href: '/admin/reports',      icon: 'BarChart3' },
  { label: 'Customers',   href: '/admin/customers',    icon: 'Users' },
  { label: 'Settings',    href: '/admin/settings',     icon: 'Settings' },
];
```

---

## Revenue Report Page

### `app/(admin)/reports/page.tsx`
```typescript
import { db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { formatCurrency } from '@/lib/utils/format';

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const now = new Date();
  const targetMonth = searchParams.month
    ? new Date(searchParams.month + '-01')
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const nextMonth = new Date(targetMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const records = await db.collection('revenue_records')
    .where('recorded_at', '>=', Timestamp.fromDate(targetMonth))
    .where('recorded_at', '<', Timestamp.fromDate(nextMonth))
    .orderBy('recorded_at', 'desc')
    .get();

  const docs = records.docs.map(d => d.data());

  const totals = docs.reduce(
    (acc, d) => ({
      subtotal: acc.subtotal + (d.subtotal ?? 0),
      delivery_spread: acc.delivery_spread + (d.delivery_spread ?? 0),
      service_charge: acc.service_charge + (d.service_charge ?? 0),
      ring_fenced: acc.ring_fenced + (d.ring_fenced_amount ?? 0),
      total: acc.total + (d.total_platform_revenue ?? 0),
    }),
    { subtotal: 0, delivery_spread: 0, service_charge: 0, ring_fenced: 0, total: 0 }
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Revenue Report</h1>

      {/* Revenue Breakdown Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Product Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(totals.subtotal)}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Delivery Spread</p>
          <p className="text-xl font-bold">{formatCurrency(totals.delivery_spread)}</p>
        </div>
        <div className="rounded-xl border border-green-400 bg-green-50 p-4">
          <p className="text-sm text-muted-foreground">Service Charges</p>
          <p className="text-xl font-bold">{formatCurrency(totals.service_charge)}</p>
          <p className="text-xs text-green-700 mt-1">Ring-fenced for fleet fund</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-xl font-bold">{docs.length}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Fleet Fund Contribution</p>
          <p className="text-xl font-bold">{formatCurrency(totals.ring_fenced)}</p>
        </div>
        <div className="rounded-xl border bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">Platform Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      {/* Per-order breakdown table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">Delivery Spread</th>
              <th className="p-3 text-right">Service Charge</th>
              <th className="p-3 text-right">Platform Revenue</th>
              <th className="p-3 text-left">Provider</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.order_id} className="border-t">
                <td className="p-3 font-mono text-xs">{doc.order_number}</td>
                <td className="p-3 text-right">{formatCurrency(doc.subtotal)}</td>
                <td className="p-3 text-right">{formatCurrency(doc.delivery_spread)}</td>
                <td className="p-3 text-right text-green-700">{formatCurrency(doc.service_charge)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(doc.total_platform_revenue)}</td>
                <td className="p-3 text-xs text-muted-foreground">{doc.logistics_provider}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {doc.recorded_at?.toDate().toLocaleDateString('en-NG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Low Stock Alert Component

### `components/admin/LowStockAlert.tsx`
```typescript
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function LowStockAlert({ products }: { products: any[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-2">Stock Alerts</h3>
        <p className="text-sm text-muted-foreground text-green-600">All products well-stocked ✓</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <h3 className="font-semibold">Low Stock ({products.length})</h3>
      </div>
      <div className="space-y-2">
        {products.slice(0, 8).map(product => (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted"
          >
            <span className="line-clamp-1">{product.name}</span>
            <Badge variant="destructive">{product.stock_kg}kg left</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
```
