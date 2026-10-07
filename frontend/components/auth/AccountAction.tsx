'use client';

import Link from 'next/link';
import { useSession } from '@/components/auth/SessionProvider';
import { Button } from '@/components/ui/button';

interface AccountActionProps {
  className?: string;
}

export function AccountAction({ className }: AccountActionProps) {
  const { status } = useSession();

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
