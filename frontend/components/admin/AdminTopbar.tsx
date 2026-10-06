'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  Menu,
  X,
  Search,
  Settings,
  Shield,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface AdminTopbarProps {
  adminEmail?: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export function AdminTopbar({ adminEmail, menuOpen, onMenuToggle }: AdminTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eyeComfortMode, setEyeComfortMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode =
      localStorage.getItem('crisprun-admin-eye-comfort') === 'true';
    setEyeComfortMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', eyeComfortMode);
    localStorage.setItem(
      'crisprun-admin-eye-comfort',
      String(eyeComfortMode)
    );
  }, [eyeComfortMode, mounted]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const target = query.toLowerCase().startsWith('cr-')
      ? '/admin/orders'
      : pathname.startsWith('/admin/orders')
        ? '/admin/orders'
        : '/admin/products';

    router.push(`${target}?search=${encodeURIComponent(query)}`);
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close admin navigation' : 'Open admin navigation'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-primary" />
          <span>Admin Panel</span>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Manage orders, products, delivery zones, and revenue.
        </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <form
          onSubmit={handleSearch}
          className="hidden h-10 w-64 items-center gap-2 rounded-full border bg-background px-3 text-sm lg:flex"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search orders or products"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            aria-label="Search orders or products"
          />
        </form>

        <Button asChild variant="secondary" className="hidden h-10 gap-2 rounded-full px-4 lg:inline-flex">
          <Link href="/catalog" target="_blank">
            <Store className="h-4 w-4" />
            Store online
          </Link>
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="Open admin settings"
            aria-expanded={settingsOpen}
          >
            <Settings className="h-5 w-5" />
          </Button>

          {settingsOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border bg-background p-2 shadow-xl">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">Admin settings</p>
                <p className="text-xs text-muted-foreground">
                  Display and quick access controls.
                </p>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
                onClick={() => setEyeComfortMode((enabled) => !enabled)}
              >
                <span className="flex items-center gap-3">
                  {eyeComfortMode ? (
                    <EyeOff className="h-4 w-4 text-primary" />
                  ) : (
                    <Eye className="h-4 w-4 text-primary" />
                  )}
                  Eye comfort mode
                </span>
                <span
                  className={cn(
                    'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
                    eyeComfortMode ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full bg-background shadow-sm transition-transform',
                      eyeComfortMode && 'translate-x-5'
                    )}
                  />
                </span>
              </button>

              <Link
                href="/catalog"
                target="_blank"
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-accent lg:hidden"
                onClick={() => setSettingsOpen(false)}
              >
                <Store className="h-4 w-4 text-primary" />
                Open customer shop
              </Link>
            </div>
          )}
        </div>

        <NotificationBell enabled={Boolean(adminEmail)} href="/admin/notifications" />

        {adminEmail && (
          <Link href="/admin/profile" className="hidden max-w-52 items-center gap-2 truncate rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted md:flex">
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            {adminEmail}
          </Link>
        )}
      </div>
    </header>
  );
}
