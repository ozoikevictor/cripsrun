'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FloatingCustomerTools } from '@/components/shared/FloatingCustomerTools';

export function SiteChrome({ children }: { children: React.ReactNode }) {
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
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="site-deep-bg flex-1 text-white">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <CartDrawer />
      <FloatingCustomerTools />
    </>
  );
}
