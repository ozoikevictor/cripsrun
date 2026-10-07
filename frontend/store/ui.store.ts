'use client';

import { create } from 'zustand';

interface UIState {
  cartNotice: { name: string; id: number } | null;
  notifyCartAdded: (name: string) => void;
  clearCartNotice: () => void;
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  cartNotice: null,
  notifyCartAdded: (name) => set({ cartNotice: { name, id: Date.now() } }),
  clearCartNotice: () => set({ cartNotice: null }),
  isCartOpen: false,
  isMobileMenuOpen: false,
  openCart: () => set({ isCartOpen: true, cartNotice: null }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () =>
    set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
}));
