/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CartNotice } from '@/components/cart/CartNotice';
import { useUIStore } from '@/store/ui.store';
import type { ProductDocument } from '@/types/product.types';
import { Timestamp } from 'firebase/firestore';

const mockAddItem = jest.fn();
jest.mock('@/store/cart.store', () => ({ useCartStore: (select: any) => select({ addItem: mockAddItem }) }));
jest.mock('@/components/catalog/ProductImage', () => ({ ProductImage: () => null }));
const product: ProductDocument = { id: 'test-chicken', name: 'Chicken', slug: 'whole-chicken', description: 'Fresh chicken', category_id: 'chicken', image_urls: [], min_kg: 1, max_kg: 10, kg_increment: 0.5, price_per_kg: 4500, product_type: 'PERISHABLE', stock_kg: 50, low_stock_threshold: 5, is_active: true, is_featured: false, sort_order: 0, tags: [], created_at: Timestamp.fromMillis(0), updated_at: Timestamp.fromMillis(0) };

describe('add to cart feedback', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    useUIStore.setState({ isCartOpen: false, cartNotice: null });
    mockAddItem.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.useRealTimers(); });
  it('adds the item and announces it without opening the basket', async () => {
    await act(async () => root.render(<><ProductCard product={product} /><CartNotice /></>));
    await act(async () => (container.querySelector('[data-testid="add-to-cart"]') as HTMLButtonElement).click());
    expect(mockAddItem).toHaveBeenCalledWith('test-chicken', expect.objectContaining({ name: 'Chicken' }), 1);
    expect(useUIStore.getState().isCartOpen).toBe(false);
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Added to cart');
    await act(async () => jest.advanceTimersByTime(3000));
    expect(useUIStore.getState().cartNotice).toBeNull();
  });
});
