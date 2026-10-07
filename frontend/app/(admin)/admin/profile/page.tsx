'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { ProfilePictureEditor } from '@/components/shared/ProfilePicture';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ShieldCheck, UserRound } from 'lucide-react';

interface AdminProfileData {
  uid: string;
  email?: string;
  role: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/api/auth/session'), { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load profile');
        if (active) setProfile(payload.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load profile');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <ShieldCheck className="h-4 w-4" /> Administrator account
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Admin profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your signed-in administrator identity.</p>
      </header>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : (
        <Card className="divide-y">
          <div className="p-5"><ProfilePictureEditor /></div>
          <div className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile?.email ?? 'Loading account...'}</p>
              {profile && <Badge className="mt-1" variant="success">Administrator</Badge>}
            </div>
          </div>
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all text-sm">{profile?.email ?? 'Loading...'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Access role</dt>
              <dd className="mt-1 text-sm">{profile?.role ?? 'Loading...'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Firebase user ID</dt>
              <dd className="mt-1 break-all font-mono text-xs">{profile?.uid ?? 'Loading...'}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
