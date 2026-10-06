import Link from 'next/link';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatKg } from '@/lib/utils/format';

interface LowStockProduct {
  id: string;
  name: string;
  stock_kg: number;
  low_stock_threshold: number;
}

export function LowStockAlert({ products }: { products: LowStockProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Stock Alerts</h3>
        <div className="flex items-center gap-2 text-crisp-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">All products well-stocked</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Low Stock ({products.length})</h3>
      </div>
      <div className="space-y-2">
        {products.slice(0, 8).map((product) => (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <span className="line-clamp-1">{product.name}</span>
            <Badge variant="destructive">{formatKg(product.stock_kg)} left</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
