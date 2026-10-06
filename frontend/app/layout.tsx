import type { Metadata } from 'next';
import './globals.css';
import { SiteChrome } from '@/components/shared/SiteChrome';

export const metadata: Metadata = {
  title: {
    default: 'CrispRun — Fresh Food Delivered',
    template: '%s | CrispRun',
  },
  description:
    'Order fresh meat, fish, and groceries online. Quality food delivered to your doorstep in Lagos, Nigeria.',
  keywords: [
    'food delivery',
    'Lagos',
    'Nigeria',
    'fresh food',
    'meat',
    'fish',
    'groceries',
    'online ordering',
  ],
  authors: [{ name: 'CrispRun' }],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: 'CrispRun',
    title: 'CrispRun — Fresh Food Delivered',
    description:
      'Order fresh meat, fish, and groceries online. Quality food delivered to your doorstep in Lagos.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
