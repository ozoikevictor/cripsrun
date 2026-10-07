'use client';

import Link from 'next/link';
import { Leaf, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  showTagline?: boolean;
  showText?: boolean;
  compact?: boolean;
  className?: string;
  markClassName?: string;
}

export function BrandLogo({
  href = '/',
  showTagline = true,
  showText = true,
  compact = false,
  className,
  markClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <div
        className={cn(
          'brand-mark relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-crisp-700 via-primary to-crisp-500 text-white shadow-sm ring-1 ring-crisp-900/10 transition-transform group-hover:scale-105',
          compact ? 'h-9 w-9 rounded-xl' : 'h-12 w-12',
          markClassName
        )}
      >
        <Leaf className={cn('absolute -left-0.5 top-1 text-white', compact ? 'h-5 w-5' : 'h-7 w-7')} />
        <Wheat className={cn('absolute bottom-1 right-1 text-crisp-100', compact ? 'h-5 w-5' : 'h-7 w-7')} />
        <span className="absolute bottom-2 left-2 h-1 w-5 rounded-full bg-white/90" />
      </div>
      {showText && (
        <div className="min-w-0 leading-none">
          <span className={cn('block font-extrabold tracking-tight', compact ? 'text-lg' : 'text-2xl')}>
            Crisp<span className="text-primary">Run</span>
          </span>
          {showTagline && (
            <span className="mt-1 hidden text-xs font-medium text-muted-foreground sm:block">
              Fresh foodstuff delivery
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    <Link href={href} className={cn('group inline-flex items-center gap-3', className)} aria-label="CrispRun home">
      {content}
    </Link>
  );
}
