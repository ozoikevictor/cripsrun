'use client';

import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { useSession } from '@/components/auth/SessionProvider';

export function Footer() {
  const { status, logout: handleLogout } = useSession();
  const isLoggedIn = status === 'authenticated';

  return (
    <footer className="border-t border-border store-inverse text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo compact showTagline={false} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Fresh food delivered to your doorstep. Quality meat, fish,
              flour, and groceries sourced fresh and delivered across Lagos.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">
              Shop
            </h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/catalog"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Browse Catalog
              </Link>
              <Link
                href="/orders"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                My Orders
              </Link>
              {status === 'loading' ? <span role="status" className="text-sm text-muted-foreground">Checking account...</span> : isLoggedIn ? (
                <button
                  type="button"
                  className="text-left text-sm text-muted-foreground transition-colors hover:text-primary"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">
              Support
            </h3>
            <nav className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">FAQ</span>
              <span className="text-sm text-muted-foreground">
                Delivery Info
              </span>
              <span className="text-sm text-muted-foreground">
                Return Policy
              </span>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">
              Contact
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+2348012345678"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Phone className="h-4 w-4 text-primary" />
                080 1234 5678
              </a>
              <a
                href="mailto:hello@crisprun.ng"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Mail className="h-4 w-4 text-primary" />
                hello@crisprun.ng
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                Lagos, Nigeria
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-crisp-800" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CrispRun. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-primary">
              Privacy Policy
            </span>
            <span className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-primary">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
