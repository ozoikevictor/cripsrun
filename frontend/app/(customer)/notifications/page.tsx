'use client';

import { apiUrl } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  order_id: string | null;
  order_number: string | null;
  created_at: string | null;
}

function formatTime(value: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        const response = await fetch(apiUrl('/api/notifications'), {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401) {
          router.replace('/login?from=/notifications');
          return;
        }

        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Unable to load notifications');
        }

        if (active) setNotifications(payload.data ?? []);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Unable to load notifications');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router]);

  async function markRead(notification: NotificationItem) {
    if (notification.read) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );

    await fetch(apiUrl(`/api/notifications/${notification.id}/read`), {
      method: 'PUT',
      credentials: 'include',
    }).catch(() => undefined);
  }

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Bell className="h-4 w-4" />
            Notifications
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Your updates</h1>
          <p className="mt-2 text-muted-foreground">
            Payment confirmations, order progress, and delivery updates will show here.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
          Loading notifications...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 py-16 text-center text-destructive">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border bg-background px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-crisp-100 text-primary">
            <Bell className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">No notifications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When you place an order or your payment is confirmed, your updates will appear here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/catalog">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'rounded-xl border bg-background p-4 shadow-sm',
                !notification.read && 'border-crisp-300 bg-crisp-50'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-crisp-100 text-primary">
                  {notification.read ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <PackageCheck className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{notification.title}</h2>
                    {!notification.read && <Badge>New</Badge>}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatTime(notification.created_at)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-2">
                  {notification.order_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/orders/${notification.order_id}`}
                        onClick={() => markRead(notification)}
                      >
                        View order
                      </Link>
                    </Button>
                  )}
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markRead(notification)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
