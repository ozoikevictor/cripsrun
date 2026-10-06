import { Timestamp } from 'firebase/firestore';

export type ProductType = 'REGULAR' | 'PERISHABLE';

export interface ProductDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  product_type: ProductType;
  price_per_kg: number;             // Integer, in Naira
  min_kg: number;                   // Varies per product (e.g., 0.5)
  max_kg: number | null;
  kg_increment: number;             // Step size (e.g., 0.5)
  stock_kg: number;
  low_stock_threshold: number;
  image_urls: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  tags: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProductDeliveryDayDocument {
  id: string;
  product_id: string;
  day_of_week: number;              // 0=Sun … 6=Sat
  cutoff_hours: number;             // Hours before midnight of delivery day
}

export interface CategoryDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
}

/** Lightweight product snapshot stored in cart items and order items */
export interface ProductSnapshot {
  name: string;
  price_per_kg: number;             // Naira
  image_url: string;
  min_kg: number;
  max_kg: number | null;
  kg_increment: number;
  product_type: ProductType;
  delivery_days: number[];          // Only populated for PERISHABLE
}
