import { Timestamp } from 'firebase/firestore';

export interface RevenueRecordDocument {
  id: string;
  order_id: string;
  order_number: string;
  user_id: string;
  // Revenue breakdown (all kobo)
  subtotal: number;                 // Product revenue
  delivery_spread: number;          // Delivery markup retained
  service_charge: number;           // Flat fee — RING-FENCED
  ring_fenced_amount: number;       // === service_charge (for fleet fund)
  total_platform_revenue: number;   // delivery_spread + service_charge
  // Reference
  zone_id: string;
  logistics_provider: string;
  recorded_at: Timestamp;
  auto_repaired?: boolean;          // Set by daily ring-fence check if auto-repaired
}
