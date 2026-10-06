'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface AccountActionProps {
  className?: string;
}

export function AccountAction({ className }: AccountActionProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading');

  useEffect(() => {
    let active = true;

    fetch(apiUrl('/api/auth/session'), {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          if (active) setStatus('guest');
          return;
        }

        const payload = await response.json();
        if (active) setStatus(payload.success ? 'authenticated' : 'guest');
      })
      .catch(() => {
        if (active) setStatus('guest');
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') return null;

  const isAuthenticated = status === 'authenticated';

  return (
    <Button
      asChild
      size="lg"
      variant="outline"
      className={className}
    >
      <Link href={isAuthenticated ? '/account' : '/register'}>
        {isAuthenticated ? 'My Profile' : 'Create account'}
      </Link>
    </Button>
  );
}