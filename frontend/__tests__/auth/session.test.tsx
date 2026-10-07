/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SessionProvider, SessionBoundary, useSession } from '@/components/auth/SessionProvider';
import { Header } from '@/components/shared/Header';

let mockPath = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
jest.mock('@/components/shared/BrandLogo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/notifications/NotificationBell', () => ({ NotificationBell: () => null }));
jest.mock('@/store/cart.store', () => ({ useCartStore: (select: any) => select({ getItemCount: () => 0 }) }));
jest.mock('@/store/ui.store', () => ({ useUIStore: (select: any) => select({ openCart: () => {} }) }));

const admin = { uid: 'admin-test', email: 'admin@example.test', role: 'admin' };
const reply = (data: unknown, ok = true) => ({ ok, status: ok ? 200 : 401, json: async () => ({ success: ok, data }) });
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function Probe() {
  const { session, status, logout } = useSession();
  return <>
    <p data-status>{status}:{session?.role ?? 'none'}</p>
    <button onClick={logout}>Logout</button>
    <SessionBoundary><p data-private>Private content</p></SessionBoundary>
  </>;
}

describe('browser session lifecycle', () => {
  let root: Root;
  let container: HTMLDivElement;
  let fetchMock: jest.Mock;
  let errors: jest.SpyInstance;
  beforeEach(() => {
    mockPath = '/';
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = jest.fn().mockResolvedValue(reply(null, false));
    global.fetch = fetchMock;
    errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    errors.mockRestore();
  });
  const render = async () => { await act(async () => root.render(<SessionProvider><Probe /></SessionProvider>)); };
  const clickLogout = async () => {
    await act(async () => { container.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  };

  it('does not trust a saved signed-in flag', async () => {
    localStorage.setItem('crisprun-session-present', 'true');
    await render();
    expect(container.querySelector('[data-status]')?.textContent).toBe('guest:none');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ cache: 'no-store', credentials: 'include' }));
  });

  it('keeps a neutral state until the first account check completes', async () => {
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    await render();
    expect(container.querySelector('[data-status]')?.textContent).toBe('loading:none');
    await act(async () => pending.resolve(reply(admin)));
    expect(container.querySelector('[data-status]')?.textContent).toBe('authenticated:admin');
  });

  it.each(['network', 'service'])('does not turn a temporary %s failure into logout', async failure => {
    fetchMock.mockResolvedValueOnce(reply(admin));
    await render();
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'));
    else fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(container.querySelector('[data-status]')?.textContent).toBe('loading:admin');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('session has not been cleared');
    expect(localStorage.getItem('crisprun-logout-at')).toBeNull();
  });

  it('keeps verified checkout content mounted during ordinary background checks', async () => {
    mockPath = '/checkout';
    fetchMock.mockResolvedValueOnce(reply(admin));
    await render();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(container.querySelector('[data-private]')).not.toBeNull();
    expect(container.querySelector('[data-status]')?.textContent).toBe('authenticated:admin');
    await act(async () => pending.resolve(reply(admin)));
  });

  it('clears the UI immediately and ignores an older session response during logout', async () => {
    const get = deferred();
    const remove = deferred();
    fetchMock.mockReturnValueOnce(get.promise).mockReturnValueOnce(remove.promise);
    await render();
    await clickLogout();
    expect(container.querySelector('[data-status]')?.textContent).toBe('guest:none');
    await act(async () => get.resolve(reply(admin)));
    expect(container.querySelector('[data-status]')?.textContent).toBe('guest:none');
    await act(async () => remove.resolve(reply(null)));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/session', expect.objectContaining({ method: 'DELETE', credentials: 'include' }));
    expect(localStorage.getItem('crisprun-logout-at')).not.toBeNull();
  });

  it('shows a retry and restores the actual state when deleting the cookie fails', async () => {
    fetchMock.mockResolvedValueOnce(reply(admin)).mockResolvedValueOnce(reply(null, false)).mockResolvedValueOnce(reply(admin));
    await render();
    await clickLogout();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Unable to log out');
    expect(container.querySelector('[data-status]')?.textContent).toBe('authenticated:admin');
    expect(localStorage.getItem('crisprun-logout-at')).toBeNull();
  });

  it('hides a cached protected page when another tab logs out', async () => {
    mockPath = '/admin/dashboard';
    fetchMock.mockResolvedValue(reply(admin));
    await render();
    expect(container.querySelector('[data-private]')).not.toBeNull();
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: 'crisprun-logout-at', newValue: '1' })));
    expect(container.querySelector('[data-private]')).toBeNull();
    expect(container.querySelector('[data-status]')?.textContent).toBe('guest:none');
  });

  it('does not render admin content for a customer session', async () => {
    mockPath = '/admin/dashboard';
    fetchMock.mockResolvedValue(reply({ ...admin, role: 'customer' }));
    await render();
    expect(container.querySelector('[data-private]')).toBeNull();
  });

  it('rechecks a protected page restored from browser history', async () => {
    mockPath = '/account';
    fetchMock.mockResolvedValueOnce(reply(admin)).mockResolvedValueOnce(reply(null, false));
    await render();
    expect(container.querySelector('[data-private]')).not.toBeNull();
    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: true });
    await act(async () => { window.dispatchEvent(event); });
    expect(container.querySelector('[data-private]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['admin', 'customer'])('shows the dashboard return link only to admins (%s)', async (role) => {
    fetchMock.mockResolvedValue(reply({ ...admin, role }));
    await act(async () => root.render(<SessionProvider><Header /></SessionProvider>));
    await act(async () => {
      container.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(Boolean(container.querySelector('a[href="/admin/dashboard"]'))).toBe(role === 'admin');
  });
});
