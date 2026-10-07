'use client';
import { ProfileAvatar } from '@/components/shared/ProfilePicture';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderOpen,
  MapPin,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useSession } from '@/components/auth/SessionProvider';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/shared/BrandLogo';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
  { label: 'Zones', href: '/admin/zones', icon: MapPin },
  { label: 'Revenue', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

interface AdminSidebarProps {
  adminEmail?: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ adminEmail, mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout: handleLogout } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          aria-label="Close admin navigation"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card shadow-xl transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 md:shadow-sm',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed && 'md:w-16'
        )}
      >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b">
        <BrandLogo compact showTagline={false} showText={!collapsed} className={cn(collapsed && 'gap-0')} />
        <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onMobileClose} aria-label="Close admin navigation">
          <X className="h-5 w-5" />
        </Button>
        {!collapsed && (
          <div className="min-w-0">
            <span className="mt-1 block text-xs text-muted-foreground">
              Admin operations
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {!collapsed && (
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Manage store
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mx-2 mb-2 rounded-xl border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Store className="h-4 w-4 text-primary" />
            Store status
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Catalog, orders, zones, and revenue tools.
          </p>
        </div>
      )}

      <div className="space-y-2 border-t p-3">
        <Link
          href="/admin/profile"
          onClick={onMobileClose}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted',
            collapsed && 'md:justify-center'
          )}
          title={collapsed ? 'Admin profile' : undefined}
        >
          <ProfileAvatar />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Admin profile</span>
              <span className="block truncate text-xs text-muted-foreground">{adminEmail ?? 'Loading account...'}</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'md:justify-center md:px-2'
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="hidden border-t p-2 md:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      </aside>
    </>
  );
}
