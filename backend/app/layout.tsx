import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Cripsron Backend',
  description: 'API service for the Cripsron app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

