'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

interface AdminSession {
  email?: string;
  uid?: string;
  role?: string;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(apiUrl('/api/auth/session'), {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace('/login?from=%2Fadmin%2Fdashboard');
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (!active || !payload) return;
        if (payload.success && payload.data?.role === 'admin') {
          setSession(payload.data);
        } else if (payload.success) {
          router.replace('/catalog');
        }
      })
      .catch(() => {
        if (active) setSession(null);
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <AdminSidebar
        adminEmail={session?.email}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar
          adminEmail={session?.email}
          menuOpen={mobileSidebarOpen}
          onMenuToggle={() => setMobileSidebarOpen((open) => !open)}
        />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/40 to-background">
          {children}
        </main>
      </div>
    </div>
  );
}