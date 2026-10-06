'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/shared/BrandLogo';

interface AuthFormProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  error?: string | null;
}

export function AuthForm({ title, subtitle, children, footer, error }: AuthFormProps) {
  return (
    <div className="site-deep-bg flex min-h-screen flex-col px-4 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-5">
        <BrandLogo showTagline={false} compact />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-crisp-100/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-6 rounded-xl border border-white/10 bg-[#0b1710]/92 p-6 shadow-2xl shadow-crisp-950/30 sm:p-8">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {children}
          </div>

          {footer && (
            <div className="text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-muted-foreground">
        Fresh food, thoughtfully delivered.
      </footer>
    </div>
  );
}
