import { Timestamp } from 'firebase/firestore';
import type { ProductSnapshot } from './product.types';

export type UserRole = 'customer' | 'admin';

export interface UserDocument {
  id: string;
  email: string;
  phone: string;                    // E.164 format: +2348012345678
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AddressDocument {
  id: string;
  user_id: string;
  label: string;                    // "Home", "Office", "Other"
  full_address: string;
  lat: number;
  lng: number;
  city: string;
  lga: string;                      // Local Government Area
  instructions: string | null;
  is_default: boolean;
  created_at: Timestamp;
}

export interface CartItemDocument {
  id: string;
  user_id: string;
  product_id: string;
  product_snapshot: ProductSnapshot;
  kg_quantity: number;
  added_at: Timestamp;
  updated_at: Timestamp;
}
