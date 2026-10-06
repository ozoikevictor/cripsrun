'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, Clock3, Loader2, RefreshCw } from 'lucide-react';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  order_id: string | null;
  order_number: string | null;
  type: string | null;
  status: string | null;
  created_at: string | null;
}

interface NotificationGroup {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  latestAt: string | null;
  unreadCount: number;
  items: AdminNotification[];
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

function labelFromCode(value: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/notifications'), {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load alerts');
      setNotifications(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load alerts');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(interval);
  }, [load]);

  const markRead = async (notification: AdminNotification) => {
    if (notification.read) return;
    setNotifications((current) => current.map((item) =>
      item.id === notification.id ? { ...item, read: true } : item
    ));
    const response = await fetch(apiUrl(`/api/notifications/${notification.id}/read`), {
      method: 'PUT',
      credentials: 'include',
    }).catch(() => null);
    if (!response?.ok) {
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, read: false } : item
      ));
    }
  };

  const markGroupRead = async (group: NotificationGroup) => {
    await Promise.all(group.items.filter((item) => !item.read).map((item) => markRead(item)));
  };

  const groups = notifications.reduce<NotificationGroup[]>((currentGroups, notification) => {
    const groupId = notification.order_id ?? notification.id;
    const existing = currentGroups.find((group) => group.id === groupId);
    if (existing) {
      existing.items.push(notification);
      existing.unreadCount += notification.read ? 0 : 1;
      if ((Date.parse(notification.created_at ?? '') || 0) > (Date.parse(existing.latestAt ?? '') || 0)) {
        existing.latestAt = notification.created_at;
      }
      return currentGroups;
    }

    currentGroups.push({
      id: groupId,
      orderId: notification.order_id,
      orderNumber: notification.order_number,
      latestAt: notification.created_at,
      unreadCount: notification.read ? 0 : 1,
      items: [notification],
    });
    return currentGroups;
  }, []).map((group) => ({
    ...group,
    items: group.items.sort((a, b) => (Date.parse(a.created_at ?? '') || 0) - (Date.parse(b.created_at ?? '') || 0)),
  })).sort((a, b) => (Date.parse(b.latestAt ?? '') || 0) - (Date.parse(a.latestAt ?? '') || 0));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Bell className="h-4 w-4" /> Admin alerts
          </div>
          <h1 className="mt-2 text-2xl font-bold">Order notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Order messages are grouped from newest order to oldest.</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => load()} disabled={isLoading} aria-label="Refresh notifications">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {isLoading && notifications.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No order alerts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">New customer orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <article key={group.id} className={`rounded-lg border p-4 ${group.unreadCount > 0 ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}>
              <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{group.orderNumber ?? 'Order notification'}</h2>
                    {group.unreadCount > 0 && <Badge>{group.unreadCount} new</Badge>}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" /> Last update {formatTime(group.latestAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {group.orderId && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/orders/${group.orderId}`} onClick={() => markGroupRead(group)}>View order</Link>
                    </Button>
                  )}
                  {group.unreadCount > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => markGroupRead(group)}>
                      <Check className="mr-2 h-4 w-4" /> Mark read
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {group.items.map((notification, index) => (
                  <div key={notification.id} className="relative pl-6">
                    {index < group.items.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%+0.25rem)] w-px bg-border" />}
                    <span className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${notification.read ? 'border-muted-foreground bg-background' : 'border-primary bg-primary'}`} />
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{notification.title}</h3>
                      {!notification.read && <Badge variant="secondary">New</Badge>}
                      {labelFromCode(notification.status) && <Badge variant="outline">{labelFromCode(notification.status)}</Badge>}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatTime(notification.created_at)}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
