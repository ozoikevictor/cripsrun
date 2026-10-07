'use client';

import { useState } from 'react';
import { useSession } from '@/components/auth/SessionProvider';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
