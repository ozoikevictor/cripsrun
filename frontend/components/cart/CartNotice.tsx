'use client';

import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';

export function CartNotice() {
  const notice = useUIStore(state => state.cartNotice);
  const clear = useUIStore(state => state.clearCartNotice);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clear, 3000);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);
  return <div role="status" aria-live="polite" className="pointer-events-none fixed left-4 right-4 top-28 z-50 mx-auto max-w-sm">
    {notice && <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-crisp-200 bg-white p-3 text-crisp-950 shadow-lg animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none">
      <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">Added to cart</span><span className="block truncate">{notice.name}</span></p>
      <button type="button" onClick={clear} aria-label="Dismiss cart confirmation" className="flex h-9 w-9 shrink-0 items-center justify-center"><X className="h-4 w-4" /></button>
    </div>}
  </div>;
}
