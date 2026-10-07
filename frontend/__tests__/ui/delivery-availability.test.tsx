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
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.useRealTimers(); });
  it('blocks missing perishable schedules instead of assuming every day', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ id: 'green-beans', name: 'Green Beans', product_type: 'PERISHABLE', days: [] }] }) });
    await act(async () => root.render(<Probe />));
    expect(result.scheduleError).toContain('Green Beans');
    expect(result.isDateAvailable('2099-01-01')).toBe(false);
    expect(result.availableDates).toEqual([]);
  });
  it('moves to the following day when an everyday product cutoff passes in Lagos', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-07T16:59:00Z'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ id: 'green-beans', name: 'Green Beans', product_type: 'PERISHABLE', days: Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, cutoff_hours: 6 })) }] }) });
    await act(async () => root.render(<Probe />));
    expect(result.nextAvailableDate).toBe('2026-10-08');
    await act(async () => jest.advanceTimersByTime(60000));
    expect(result.isDateAvailable('2026-10-08')).toBe(false);
    expect(result.nextAvailableDate).toBe('2026-10-09');
    expect(result.isDateAvailable('2026-02-30')).toBe(false);
  });
  it('offers only dates shared by all perishable items', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [
      { id: 'green-beans', name: 'Green Beans', product_type: 'PERISHABLE', days: [{ day_of_week: 4, cutoff_hours: 24 }] },
      { id: 'other', name: 'Other', product_type: 'PERISHABLE', days: [{ day_of_week: 5, cutoff_hours: 24 }] },
    ] }) });
    await act(async () => root.render(<Probe />));
    expect(result.deliveryType).toBe('MUST_SPLIT');
    expect(result.availableDates).toEqual([]);
    expect(result.nextAvailableDate).toBeNull();
  });
  it('can retry a temporary availability failure', async () => {
    const fetchMock = jest.fn().mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [{ id: 'green-beans', name: 'Rice', product_type: 'REGULAR', days: [] }] }) });
    global.fetch = fetchMock;
    await act(async () => root.render(<Probe />));
    expect(result.scheduleError).toBe('Network unavailable');
    await act(async () => result.retry());
    expect(result.scheduleError).toBeNull();
    expect(result.availableDates.length).toBe(28);
  });
  it('allows only configured days and blocks expired cutoffs', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ id: 'green-beans', name: 'Green Beans', product_type: 'PERISHABLE', days: [{ day_of_week: 4, cutoff_hours: 24 }] }] }) });
    await act(async () => root.render(<Probe />));
    expect(result.isDateAvailable('2099-01-01')).toBe(true);
    expect(result.isDateAvailable('2099-01-02')).toBe(false);
    expect(result.isDateAvailable('2020-01-02')).toBe(false);
  });
});
