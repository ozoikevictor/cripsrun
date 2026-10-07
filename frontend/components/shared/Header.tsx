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
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSession } from '@/components/auth/SessionProvider';

const NAV_LINKS = [
  { label: 'Shop', href: '/catalog' },
  { label: 'My Orders', href: '/orders' },
];

const CATEGORY_LINKS = [
  'Beef',
  'Chicken',
  'Fish & Seafood',
  'Dry Fish',
  'Rice & Beans',
  'Stew Items',
  'Soup Items',
  'Fresh Produce',
  'Yam & Plantain',
  'Oil',
  'Flour & Baking',
];

export function Header() {
  const itemCount = useCartStore((s) => s.getItemCount());
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [eyeComfortMode, setEyeComfortMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { session, status: sessionStatus, logout } = useSession();

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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#06180f]/95 text-white shadow-lg shadow-crisp-950/20 backdrop-blur-md">
      <div className="border-b border-white/10 bg-[#031009] text-white">
        <div className="container flex h-8 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-3.5 w-3.5 text-crisp-300" />
            <span className="hidden sm:inline">Fresh food delivery across Lagos</span>
            <span className="sm:hidden">Lagos delivery</span>
          </div>
          <div className="flex items-center gap-2 text-crisp-100">
            <Clock className="h-3.5 w-3.5 text-crisp-300" />
            <span>Order today, schedule delivery</span>
          </div>
        </div>
      </div>

      <div className="relative flex h-16 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/10 hover:text-crisp-200 sm:left-4 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="container flex items-center justify-between gap-4 pl-14 sm:pl-16 md:pl-0">
          <BrandLogo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-semibold text-crisp-50 transition-colors hover:text-crisp-200',
                pathname === link.href && 'text-crisp-200 underline decoration-2 underline-offset-8'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-crisp-200"
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

          <NotificationBell enabled={sessionStatus === 'authenticated'} />

          <div className="relative hidden md:block">
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-md px-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 hover:text-crisp-200"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setAccountMenuOpen(false);
              }}
            >
              <UserRound className="h-5 w-5" />
              {session?.email ? session.email.split('@')[0] : 'Account'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', accountMenuOpen && 'rotate-180')} />
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
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-white/10 bg-[#071b10]/95 py-2 text-white shadow-xl backdrop-blur-md"
                  role="menu"
                >
                  {session?.email && (
                    <div className="border-b border-crisp-100 px-4 pb-3 pt-1">
                      <p className="text-sm font-semibold">Your account</p>
                      <p className="mt-0.5 truncate text-xs text-crisp-100/70">{session.email}</p>
                    </div>
                  )}
                  {sessionStatus === 'authenticated' ? (
                    <>
                      <Link href="/account" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                        <UserRound className="h-4 w-4 text-crisp-300" /> My Profile
                      </Link>
                      {session?.role === 'admin' && (
                        <Link href="/admin/dashboard" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                          <Shield className="h-4 w-4 text-crisp-300" /> Admin Dashboard
                        </Link>
                      )}
                      <Link href="/orders" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                        <PackageCheck className="h-4 w-4 text-crisp-300" /> My Orders
                      </Link>
                      <Link href="/catalog" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                        <Store className="h-4 w-4 text-crisp-300" /> Shop
                      </Link>
                      <Link href="/notifications" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                        <Bell className="h-4 w-4 text-crisp-300" /> Notifications
                      </Link>
                      <div className="my-1 border-t border-crisp-100" />
                      <button type="button" role="menuitem" className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-crisp-100 hover:bg-white/10" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 text-crisp-300" /> Sign Out
                      </button>
                    </>
                  ) : sessionStatus === 'loading' ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Checking account...</p>
                  ) : (
                    <>
                      <Link href="/login" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                        <UserRound className="h-4 w-4 text-crisp-300" /> Sign In
                      </Link>
                      <Link href="/register" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10" onClick={() => setAccountMenuOpen(false)}>
                        <Heart className="h-4 w-4 text-crisp-300" /> Create Account
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
          <SheetContent side="left" className="mobile-navigation flex w-[min(85vw,320px)] flex-col overflow-y-auto overscroll-contain border-white/10 bg-[#071b10] p-5 text-white data-[state=open]:duration-200 data-[state=closed]:duration-150">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="text-white">CrispRun</SheetTitle>
              <SheetDescription className="text-crisp-100">Your fresh market</SheetDescription>
            </SheetHeader>
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search products..."
                className="h-11 w-full border border-white/10 bg-white/10 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-crisp-100/60 focus:border-crisp-300"
              />
            </div>

            <nav className="space-y-1">
              <Link
                href="/catalog"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4" />
                Store Home
              </Link>
              <Link
                href="/catalog"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Grid2X2 className="h-4 w-4" />
                Marketplace
              </Link>
              <Link
                href="/catalog"
                className="flex items-center gap-3 py-2.5 text-sm font-medium transition-colors hover:text-crisp-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <PackageCheck className="h-4 w-4" />
                Categories
              </Link>
              <Link
                href="/cart"
                className="flex w-full items-center gap-3 rounded px-2 py-2.5 text-sm font-medium text-crisp-100 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingBasket className="h-4 w-4" />
                Cart
                {mounted && itemCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
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

            <div className="mt-7">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-crisp-700">
                Categories
              </p>
              <div className="grid grid-cols-1 gap-0">
                {CATEGORY_LINKS.map((category) => (
                  <Link
                    key={category}
                    href={`/catalog?category=${encodeURIComponent(category)}`}
                    className="py-2 text-sm text-muted-foreground transition-colors hover:text-crisp-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

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
                  <Link href="/admin/dashboard" className="flex items-center gap-3 py-2 text-sm font-medium hover:text-crisp-200" onClick={() => setMobileMenuOpen(false)}>
                    <Shield className="h-4 w-4" /> Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  className="block py-2 text-left text-sm font-medium text-crisp-100 transition-colors hover:text-white"
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
