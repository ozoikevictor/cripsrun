'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  Bell,
  ChevronDown,
  Eye,
  EyeOff,
  Grid2X2,
  Heart,
  Home,
  LogOut,
  Menu,
  PackageCheck,
  Search,
  Store,
  Shield,
  ShoppingBasket,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart.store';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSession } from '@/components/auth/SessionProvider';

const NAV_LINKS = [
  { label: 'Shop', href: '/catalog' },
  { label: 'My Orders', href: '/orders' },
];

export function Header() {
  const itemCount = useCartStore((s) => s.getItemCount());
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [eyeComfortMode, setEyeComfortMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewportTop, setViewportTop] = useState(0);
  const { session, status: sessionStatus, logout } = useSession();

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    // iOS can pan the visual viewport independently when the keyboard opens.
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      const keyboardOpen = editing && viewport.scale === 1 && window.innerHeight - viewport.height > 100;
      setViewportTop(keyboardOpen ? Math.max(0, viewport.offsetTop) : 0);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  // Prevent hydration mismatch — cart count comes from localStorage
  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem('crisprun-eye-comfort') === 'true';
    setEyeComfortMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', eyeComfortMode);
    localStorage.setItem('crisprun-eye-comfort', String(eyeComfortMode));
  }, [eyeComfortMode, mounted]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    await logout();
  };

  return (
    <header style={{ top: viewportTop }} className="fixed inset-x-0 top-0 z-40 w-full border-b border-border bg-card/95 text-foreground shadow-sm backdrop-blur-md">
      <div className="border-b border-border bg-secondary text-muted-foreground">
        <div className="container flex h-8 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Fresh food delivery across Lagos</span>
            <span className="sm:hidden">Lagos delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Order today, schedule delivery</span>
          </div>
        </div>
      </div>

      <div className="relative flex h-16 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-muted-foreground hover:bg-black/5 hover:text-primary sm:left-4 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="container flex items-center justify-between gap-2 pl-14 sm:pl-16 md:pl-0">
          <BrandLogo compact showTagline={false} className="min-w-0 gap-2" />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-semibold text-muted-foreground transition-colors hover:text-primary',
                pathname === link.href && 'text-primary underline decoration-2 underline-offset-8'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
            aria-label="Open cart"
            id="cart-button"
          >
            <ShoppingBasket className="h-6 w-6" />
            {mounted && itemCount > 0 && (
              <Badge
                variant="default"
                className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] animate-scale-in"
              >
                {itemCount}
              </Badge>
            )}
          </Link>

          <div data-testid="header-notifications-slot" className="flex h-10 w-10 shrink-0 items-center justify-center">
            <NotificationBell enabled={sessionStatus === 'authenticated'} />
          </div>

          <div className="relative hidden md:block">
            <button
              type="button"
              className="flex h-10 w-40 items-center gap-2 rounded-md px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-black/5 hover:text-primary"
              disabled={sessionStatus === 'loading'}
              aria-busy={sessionStatus === 'loading'}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setAccountMenuOpen(false);
              }}
            >
              <UserRound className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">
                {sessionStatus === 'authenticated' && session?.email ? session.email.split('@')[0] : 'Account'}
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', accountMenuOpen && 'rotate-180')} />
            </button>

            {accountMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close account menu"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border bg-white py-2 text-foreground shadow-xl"
                  role="menu"
                >
                  {session?.email && (
                    <div className="border-b border-crisp-100 px-4 pb-3 pt-1">
                      <p className="text-sm font-semibold">Your account</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{session.email}</p>
                    </div>
                  )}
                  {sessionStatus === 'authenticated' ? (
                    <>
                      <Link href="/account" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                        <UserRound className="h-4 w-4 text-primary" /> My Profile
                      </Link>
                      {session?.role === 'admin' && (
                        <Link href="/admin/dashboard" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                          <Shield className="h-4 w-4 text-primary" /> Admin Dashboard
                        </Link>
                      )}
                      <Link href="/orders" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                        <PackageCheck className="h-4 w-4 text-primary" /> My Orders
                      </Link>
                      <Link href="/catalog" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                        <Store className="h-4 w-4 text-primary" /> Shop
                      </Link>
                      <Link href="/notifications" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                        <Bell className="h-4 w-4 text-primary" /> Notifications
                      </Link>
                      <div className="my-1 border-t border-crisp-100" />
                      <button type="button" role="menuitem" className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 text-primary" /> Sign Out
                      </button>
                    </>
                  ) : sessionStatus === 'loading' ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Checking account...</p>
                  ) : (
                    <>
                      <Link href="/login" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                        <UserRound className="h-4 w-4 text-primary" /> Sign In
                      </Link>
                      <Link href="/register" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent" onClick={() => setAccountMenuOpen(false)}>
                        <Heart className="h-4 w-4 text-primary" /> Create Account
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent
            ref={mobileMenuRef}
            side="left"
            tabIndex={-1}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              mobileMenuRef.current?.focus({ preventScroll: true });
            }}
            className="mobile-navigation flex w-[min(85vw,320px)] flex-col overflow-y-auto overscroll-contain border-border bg-card p-5 text-foreground data-[state=open]:duration-200 data-[state=closed]:duration-150"
          >
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="text-foreground">CrispRun</SheetTitle>
              <SheetDescription className="text-muted-foreground">Your fresh market</SheetDescription>
            </SheetHeader>
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search products..."
                className="h-11 w-full border border-border bg-secondary pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-crisp-300"
              />
            </div>

            <nav className="space-y-1">
              <Link
                href="/"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4" />
                Crisp Home
              </Link>
              <Link
                href="/catalog"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Grid2X2 className="h-4 w-4" />
                Categories
              </Link>
              <Link
                href="/cart"
                className="flex w-full items-center gap-3 rounded px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingBasket className="h-4 w-4" />
                Cart
                {mounted && itemCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link
                href="/notifications"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <PackageCheck className="h-4 w-4" />
                My Orders
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserRound className="h-4 w-4" />
                My Profile
              </Link>
            </nav>

            <div className="mt-7 space-y-2 border-t border-crisp-100 pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-left text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setEyeComfortMode((enabled) => !enabled)}
              >
                <span className="flex items-center gap-2">
                  {eyeComfortMode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Eye comfort mode
                </span>
                <span className={eyeComfortMode ? 'text-primary' : 'text-crisp-700'}>
                  {eyeComfortMode ? 'On' : 'Off'}
                </span>
              </button>

              {sessionStatus === 'loading' ? (
                <div className="py-2 text-sm font-medium text-crisp-700">
                  Checking account...
                </div>
              ) : sessionStatus === 'authenticated' ? (
                <Link
                  href="/account"
                  className="block py-2 text-sm font-medium transition-colors hover:text-crisp-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block py-2 text-sm font-medium transition-colors hover:text-crisp-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="block py-2 text-sm font-medium transition-colors hover:text-crisp-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Create Account
                  </Link>
                </>
              )}

              {sessionStatus === 'authenticated' && (
                <>
                {session?.role === 'admin' && (
                  <Link href="/admin/dashboard" className="flex items-center gap-3 py-2 text-sm font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                    <Shield className="h-4 w-4" /> Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  className="block py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
                </>
              )}
            </div>
          </SheetContent>
      </Sheet>
    </header>
  );
}
