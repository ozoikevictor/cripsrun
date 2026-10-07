'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatKg } from '@/lib/utils/format';

interface KgSelectorProps {
  value: number;
  onChange: (kg: number) => void;
  minKg: number;
  maxKg: number | null;
  increment: number;
  compact?: boolean;
}

export function KgSelector({
  value,
  onChange,
  minKg,
  maxKg,
  increment,
  compact = false,
}: KgSelectorProps) {
  const canDecrease = value - increment >= minKg;
  const canIncrease = maxKg ? value + increment <= maxKg : true;

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(Math.round((value - increment) * 10) / 10);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(Math.round((value + increment) * 10) / 10);
    }
  };

  return (
    <div
      className={`flex items-center gap-1 ${compact ? '' : 'gap-2'}`}
      role="group"
      aria-label="Quantity selector"
    >
      <Button
        variant="outline"
        size="icon"
        className={`${compact ? 'h-7 w-7' : 'h-9 w-9'} rounded-full transition-all duration-150`}
        onClick={handleDecrease}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
      >
        <Minus className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      </Button>

      <span
        className={`${compact ? 'w-10 break-words text-xs' : 'min-w-[4.5rem] text-sm'} text-center font-semibold tabular-nums`}
      >
        {formatKg(value)}
      </span>

      <Button
        variant="outline"
        size="icon"
        className={`${compact ? 'h-7 w-7' : 'h-9 w-9'} rounded-full transition-all duration-150`}
        onClick={handleIncrease}
        disabled={!canIncrease}
        aria-label="Increase quantity"
      >
        <Plus className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      </Button>
    </div>
  );
}
