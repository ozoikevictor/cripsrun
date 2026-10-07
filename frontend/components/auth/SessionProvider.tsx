'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiUrl } from '@/lib/api';

interface Session { uid: string; email?: string; role: 'customer' | 'admin'; }
type Status = 'loading' | 'authenticated' | 'guest';
interface SessionContextValue {
  session: Session | null;
  status: Status;
  loggingOut: boolean;
  logout: () => Promise<void>;
}
const SessionContext = createContext<SessionContextValue | null>(null);
const LOGOUT_KEY = 'crisprun-logout-at';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState(false);
  const revision = useRef(0);
  const logoutPending = useRef(false);

  const refresh = useCallback(async (block = false) => {
    if (logoutPending.current) return;
    const current = ++revision.current;
    setStatus(current => block || current !== 'authenticated' ? 'loading' : current);
    try {
      const response = await fetch(apiUrl('/api/auth/session'), { credentials: 'include', cache: 'no-store' });
      if (!response.ok && response.status !== 401) throw new Error('Account check unavailable');
      const payload = await response.json();
      if (current !== revision.current) return;
      const user = response.ok && payload.success ? payload.data : null;
      setSession(user);
      setStatus(user ? 'authenticated' : 'guest');
      setVerificationError(false);
    } catch {
      if (current === revision.current) { setStatus('loading'); setVerificationError(true); }
    }
  }, []);

  const logout = useCallback(async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    revision.current++;
    setSession(null);
    setStatus('guest');
    setLoggingOut(true);
    setError(null);
    localStorage.removeItem('crisprun-session-present');
    try {
      const response = await fetch(apiUrl('/api/auth/session'), {
        method: 'DELETE', credentials: 'include', cache: 'no-store',
      });
      if (!response.ok) throw new Error('Logout failed');
      localStorage.setItem(LOGOUT_KEY, String(Date.now()));
      window.location.replace('/login');
    } catch {
      logoutPending.current = false;
      setLoggingOut(false);
      setError('Unable to log out. Please try again.');
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const requests = revision;
    void refresh();
    return () => { requests.current++; };
  }, [pathname, refresh]);

  useEffect(() => {
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) void refresh(true); };
    const focus = () => { void refresh(); };
    const storage = (event: StorageEvent) => {
      if (event.key === LOGOUT_KEY) {
        revision.current++;
        setSession(null);
        setStatus('guest');
      }
    };
    window.addEventListener('pageshow', pageShow);
    window.addEventListener('focus', focus);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener('focus', focus);
      window.removeEventListener('storage', storage);
    };
  }, [refresh]);

  return <SessionContext.Provider value={{ session, status, loggingOut, logout }}>
    {verificationError && <div role="alert" className="bg-amber-950 px-4 py-3 text-sm text-white">
      Unable to check your account. Your session has not been cleared. <button onClick={() => void refresh()} className="underline">Retry</button>
    </div>}
    {error && <div role="alert" className="bg-red-950 px-4 py-3 text-sm text-white">
      {error} <button onClick={logout} className="underline">Retry logout</button>
    </div>}
    {children}
  </SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider');
  return value;
}

export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, status, loggingOut } = useSession();
  const protectedPage = ['/admin', '/account', '/orders', '/checkout', '/notifications', '/track'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const authorized = status === 'authenticated' &&
    (!pathname.startsWith('/admin') || session?.role === 'admin');
  useEffect(() => {
    if (protectedPage && status !== 'loading' && !authorized && !loggingOut) {
      window.location.replace(status === 'authenticated' ? '/catalog' : `/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [authorized, loggingOut, pathname, protectedPage, status]);
  if (protectedPage && !authorized) {
    return <div role="status" className="p-6 text-sm text-white">{loggingOut ? 'Signing out...' : 'Checking account...'}</div>;
  }
  return <>{children}</>;
}
