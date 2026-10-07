/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AccountPage from '@/app/(customer)/account/page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/auth/SessionProvider', () => ({ useSession: () => ({ logout: jest.fn() }) }));
const profile = { uid: 'test', full_name: 'Test Customer', email: 'customer@example.test', phone: '08000000000', role: 'customer', addresses: [], created_at: '2026-01-01' };

describe('account controls', () => {
  let root: Root;
  let container: HTMLDivElement;
  let request: jest.Mock;
  beforeEach(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    request = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: profile }) });
    global.fetch = request;
    await act(async () => root.render(<AccountPage />));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('saves profile edits through the existing profile endpoint', async () => {
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Edit')!.click());
    expect(container.querySelector('label[for="account-name"]')).not.toBeNull();
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Save Changes')!.click());
    expect(request).toHaveBeenLastCalledWith(expect.stringContaining('/api/users/profile'), expect.objectContaining({ method: 'POST', credentials: 'include' }));
    expect(container.querySelector('#account-name')).toBeNull();
    expect(container.querySelector('.bg-card')?.className).toContain('text-card-foreground');
  });
  it('opens a labelled address form and can cancel it', async () => {
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Add Address')!.click());
    expect(container.querySelector('#address-full_address')).not.toBeNull();
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Cancel')!.click());
    expect(container.querySelector('#address-full_address')).toBeNull();
  });
});
