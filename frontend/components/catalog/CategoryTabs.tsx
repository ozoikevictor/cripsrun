'use client';

import { cn } from '@/lib/utils';
import type { CategoryDocument } from '@/types/product.types';

interface CategoryTabsProps {
  categories: CategoryDocument[];
  activeCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  counts?: Record<string, number>;
  totalCount?: number;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  counts = {},
  totalCount = 0,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
          activeCategory === null
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-secondary text-secondary-foreground hover:bg-accent'
        )}
      >
        <span>All</span>
        <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
          {totalCount}
        </span>
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap',
            activeCategory === cat.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary text-secondary-foreground hover:bg-accent'
          )}
        >
          <span>{cat.name}</span>
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
            {counts[cat.id] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
