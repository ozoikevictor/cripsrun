import { Timestamp } from 'firebase/firestore';

export interface DeliveryZoneDocument {
  id: string;
  name: string;
  description: string | null;
  lgas: string[];                   // List of LGAs covered
  areas: string[];                  // Neighbourhoods
  base_logistics_cost: number;      // kobo — INTERNAL, never shown to customer
  customer_delivery_fee: number;    // kobo — what customer sees
  delivery_spread: number;          // kobo — platform margin
  service_charge: number;           // kobo — ring-fenced
  estimated_delivery_minutes: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
