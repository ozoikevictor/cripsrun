'use client';

import { apiUrl } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function NotificationBell({ enabled, href = '/notifications' }: { enabled: boolean; href?: string }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const response = await fetch(apiUrl('/api/notifications'), {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) return;

        const payload = await response.json();
        if (!cancelled && payload.success) {
          setUnreadCount(payload.unread_count ?? 0);
        }
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    }

    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Link
      href={href}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center text-current transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2"
      aria-label="Open notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Link>
  );
}
