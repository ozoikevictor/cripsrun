'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RevenueRecord {
  order_id: string;
  order_number: string;
  subtotal: number;
  delivery_spread: number;
  service_charge: number;
  ring_fenced_amount: number;
  total_platform_revenue: number;
  logistics_provider: string;
  recorded_at: string;
}

export function AdminRevenueReport() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/admin/reports/revenue'), {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load revenue report');
      setRecords(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load revenue report');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = records.reduce(
    (acc, record) => ({
      subtotal: acc.subtotal + record.subtotal,
      deliverySpread: acc.deliverySpread + record.delivery_spread,
      serviceCharge: acc.serviceCharge + record.service_charge,
      ringFenced: acc.ringFenced + record.ring_fenced_amount,
      platformRevenue: acc.platformRevenue + record.total_platform_revenue,
    }),
    { subtotal: 0, deliverySpread: 0, serviceCharge: 0, ringFenced: 0, platformRevenue: 0 }
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Revenue Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">Revenue breakdown from paid orders in the database.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {isLoading && records.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading revenue records...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Summary title="Product Revenue" amount={totals.subtotal} />
            <Summary title="Delivery Spread" amount={totals.deliverySpread} />
            <Summary title="Service Charges" amount={totals.serviceCharge} highlighted />
            <Summary title="Paid Orders" count={records.length} />
            <Summary title="Fleet Fund Total" amount={totals.ringFenced} highlighted />
            <Summary title="Platform Revenue" amount={totals.platformRevenue} />
          </div>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">Per-Order Breakdown</h2>
            </div>
            {records.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No paid orders to report yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium text-muted-foreground">Order</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">Subtotal</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">Spread</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">Service</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">Platform Rev.</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Provider</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.order_id} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{record.order_number}</td>
                        <td className="p-3 text-right">{formatCurrency(record.subtotal)}</td>
                        <td className="p-3 text-right">{formatCurrency(record.delivery_spread)}</td>
                        <td className="p-3 text-right text-primary">{formatCurrency(record.service_charge)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(record.total_platform_revenue)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{record.logistics_provider}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(record.recorded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="rounded-lg border border-crisp-200 bg-crisp-50 p-4 dark:bg-crisp-950">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Ring-Fence Integrity</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fleet fund ({formatCurrency(totals.ringFenced)}) {totals.ringFenced === totals.serviceCharge ? 'matches' : 'does not match'} service charges ({formatCurrency(totals.serviceCharge)}).
                  {' '}<Badge variant={totals.ringFenced === totals.serviceCharge ? 'success' : 'destructive'}>{totals.ringFenced === totals.serviceCharge ? 'Verified' : 'Review'}</Badge>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ title, amount, count, highlighted }: { title: string; amount?: number; count?: number; highlighted?: boolean }) {
  return (
    <div className={`space-y-1 rounded-xl border p-4 ${highlighted ? 'border-crisp-300 bg-crisp-50 dark:bg-crisp-950' : 'bg-card'}`}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-xl font-bold">{amount !== undefined ? formatCurrency(amount) : (count ?? 0).toLocaleString()}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-NG', { dateStyle: 'medium' });
}
