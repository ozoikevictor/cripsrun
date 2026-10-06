'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductSnapshot } from '@/types/product.types';
import { calcLineTotal } from '@/lib/utils/format';

export interface CartItem {
  product_id: string;
  product_snapshot: ProductSnapshot;
  kg_quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product_id: string, snapshot: ProductSnapshot, kg: number) => void;
  updateKg: (product_id: string, kg: number) => void;
  removeItem: (product_id: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
  getLineTotal: (product_id: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product_id, snapshot, kg) => {
        const { items } = get();
        const existing = items.find((i) => i.product_id === product_id);

        if (existing) {
          // Update quantity if item already in cart
          set({
            items: items.map((i) =>
              i.product_id === product_id
                ? { ...i, kg_quantity: kg }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              { product_id, product_snapshot: snapshot, kg_quantity: kg },
            ],
          });
        }
      },

      updateKg: (product_id, kg) => {
        const { items } = get();
        const item = items.find((i) => i.product_id === product_id);
        if (!item) return;

        // Enforce min_kg
        const effectiveKg = Math.max(kg, item.product_snapshot.min_kg);

        // Enforce max_kg if set
        const cappedKg = item.product_snapshot.max_kg
          ? Math.min(effectiveKg, item.product_snapshot.max_kg)
          : effectiveKg;

        set({
          items: items.map((i) =>
            i.product_id === product_id
              ? { ...i, kg_quantity: cappedKg }
              : i
          ),
        });
      },

      removeItem: (product_id) => {
        set({ items: get().items.filter((i) => i.product_id !== product_id) });
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) =>
            sum +
            calcLineTotal(item.product_snapshot.price_per_kg, item.kg_quantity),
          0
        );
      },

      getItemCount: () => get().items.length,

      getLineTotal: (product_id) => {
        const item = get().items.find((i) => i.product_id === product_id);
        if (!item) return 0;
        return calcLineTotal(
          item.product_snapshot.price_per_kg,
          item.kg_quantity
        );
      },
    }),
    {
      name: 'crisprun-cart',
    }
  )
);
