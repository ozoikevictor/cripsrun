/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FloatingCustomerTools } from '@/components/shared/FloatingCustomerTools';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { getProductImage } from '@/lib/products/images';

describe('customer UI regressions', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, unread_count: 120 }) });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });
  it('scrolls only the conversation when sending a message', async () => {
    const pageScroll = jest.fn();
    HTMLElement.prototype.scrollIntoView = pageScroll;
    await act(async () => root.render(<FloatingCustomerTools />));
    await act(async () => (container.querySelector('[aria-label="Open CrispRun AI"]') as HTMLButtonElement).click());
    const log = container.querySelector('[role="log"]') as HTMLElement;
    Object.defineProperty(log, 'scrollHeight', { value: 640 });
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'How does delivery work?')!.click());
    expect(log.scrollTop).toBe(640);
    expect(pageScroll).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('CrispRun AI');
    expect(container.querySelector('input')?.className).toContain('text-base');
  });
  it('inherits bell contrast and caps large unread counts', async () => {
    await act(async () => root.render(<NotificationBell enabled />));
    expect(container.querySelector('a')?.className).toContain('text-current');
    expect(container.textContent).toContain('99+');
    await act(async () => root.render(<NotificationBell enabled={false} />));
    expect(container.querySelector('a[aria-label="Open notifications"]')).not.toBeNull();
    expect(container.textContent).not.toContain('99+');
  });
  it('shows the bell to visitors without requesting private notifications', async () => {
    await act(async () => root.render(<NotificationBell enabled={false} />));
    expect(container.querySelector('.lucide-bell')).not.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
  it('uses specific food pictures before broad keywords', () => {
    expect(getProductImage({ slug: 'new-dry-fish', name: 'Dry fish', image_urls: [] })).toContain('dry-fish');
    expect(getProductImage({ slug: 'new-green-pepper', name: 'Green pepper', image_urls: [] })).toContain('green-pepper');
  });
});
