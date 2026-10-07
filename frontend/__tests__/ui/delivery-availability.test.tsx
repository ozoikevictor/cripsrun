/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useDeliveryDates } from '@/hooks/useDeliveryDates';

jest.mock('@/store/cart.store', () => ({ useCartStore: (select: any) => select({ items: [{ product_id: 'green-beans' }] }) }));
let result: ReturnType<typeof useDeliveryDates>;
function Probe() { result = useDeliveryDates(); return <p>{result.scheduleError}</p>; }
describe('checkout delivery availability', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('blocks missing perishable schedules instead of assuming every day', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ id: 'green-beans', name: 'Green Beans', product_type: 'PERISHABLE', days: [] }] }) });
    await act(async () => root.render(<Probe />));
    expect(result.scheduleError).toContain('Green Beans');
    expect(result.isDateAvailable('2099-01-01')).toBe(false);
  });
  it('allows only configured days and blocks expired cutoffs', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ id: 'green-beans', name: 'Green Beans', product_type: 'PERISHABLE', days: [{ day_of_week: 4, cutoff_hours: 24 }] }] }) });
    await act(async () => root.render(<Probe />));
    expect(result.isDateAvailable('2099-01-01')).toBe(true);
    expect(result.isDateAvailable('2099-01-02')).toBe(false);
    expect(result.isDateAvailable('2020-01-02')).toBe(false);
  });
});
