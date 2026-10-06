'use client';

import { apiUrl } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/shared/BrandLogo';

export function Footer() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(apiUrl('/api/auth/session'), {
          credentials: 'include',
          cache: 'no-store',
        });
        setIsLoggedIn(response.ok);
      } catch {
        setIsLoggedIn(false);
      }
    }

    loadSession();
  }, []);

  const handleLogout = async () => {
    await fetch(apiUrl('/api/auth/session'), {
      method: 'DELETE',
      credentials: 'include',
    });
    localStorage.removeItem('crisprun-session-present');
    setIsLoggedIn(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <footer className="border-t border-white/10 bg-[#020b07] text-crisp-50">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo compact showTagline={false} />
            <p className="text-sm leading-relaxed text-crisp-100/80">
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
                className="text-sm text-crisp-100/80 transition-colors hover:text-white"
              >
                Browse Catalog
              </Link>
              <Link
                href="/orders"
                className="text-sm text-crisp-100/80 transition-colors hover:text-white"
              >
                My Orders
              </Link>
              {isLoggedIn ? (
                <button
                  type="button"
                  className="text-left text-sm text-crisp-100/80 transition-colors hover:text-white"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-crisp-100/80 transition-colors hover:text-white"
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
              <span className="text-sm text-crisp-100/80">FAQ</span>
              <span className="text-sm text-crisp-100/80">
                Delivery Info
              </span>
              <span className="text-sm text-crisp-100/80">
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
                className="flex items-center gap-2 text-sm text-crisp-100/80 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 text-crisp-300" />
                080 1234 5678
              </a>
              <a
                href="mailto:hello@crisprun.ng"
                className="flex items-center gap-2 text-sm text-crisp-100/80 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-crisp-300" />
                hello@crisprun.ng
              </a>
              <div className="flex items-center gap-2 text-sm text-crisp-100/80">
                <MapPin className="h-4 w-4 flex-shrink-0 text-crisp-300" />
                Lagos, Nigeria
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-crisp-800" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-crisp-100/70">
            &copy; {new Date().getFullYear()} CrispRun. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="cursor-pointer text-xs text-crisp-100/70 transition-colors hover:text-white">
              Privacy Policy
            </span>
            <span className="cursor-pointer text-xs text-crisp-100/70 transition-colors hover:text-white">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
