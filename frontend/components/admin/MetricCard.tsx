import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  type: 'currency' | 'number';
  change?: number;        // % change (positive = up, negative = down)
  subtitle?: string;
  urgent?: boolean;
  href?: string;
}

export function MetricCard({ title, value, type, change, subtitle, urgent, href }: MetricCardProps) {
  const displayValue = type === 'currency' ? formatCurrency(value) : value.toLocaleString();
  const className = cn(
    'block rounded-xl border bg-card p-4 space-y-2 transition-all hover:shadow-sm',
    href && 'hover:border-primary/40',
    urgent && 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/30'
  );

  const content = (
    <>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold tracking-tight">{displayValue}</p>

      {change !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs',
            change > 0
              ? 'text-crisp-600'
              : change < 0
              ? 'text-red-500'
              : 'text-muted-foreground'
          )}
        >
          {change > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : change < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          <span>{Math.abs(change).toFixed(1)}% vs yesterday</span>
        </div>
      )}

      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
