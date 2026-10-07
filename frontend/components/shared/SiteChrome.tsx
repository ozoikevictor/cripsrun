'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CartNotice } from '@/components/cart/CartNotice';
import { FloatingCustomerTools } from '@/components/shared/FloatingCustomerTools';
import { SessionProvider, SessionBoundary } from '@/components/auth/SessionProvider';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return <SessionProvider><ChromeContent>{children}</ChromeContent></SessionProvider>;
}

function ChromeContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPlainPage =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password');
  const hideFooter =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart') ||
    /^\/orders\/[^/]+/.test(pathname) ||
    pathname.startsWith('/track/');

  if (isPlainPage) {
    return <SessionBoundary>{children}</SessionBoundary>;
  }

  return (
    <>
      <Header />
      <main className="customer-content site-deep-bg flex-1 text-white">
        <SessionBoundary>{children}</SessionBoundary>
      </main>
      {!hideFooter && <Footer />}
      <CartNotice />
      <FloatingCustomerTools />
    </>
  );
}
