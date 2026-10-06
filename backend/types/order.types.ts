import { Timestamp } from 'firebase/firestore';
import type { ProductType } from './product.types';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'AWAITING_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_DELIVERY';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type DeliveryType = 'SINGLE' | 'SPLIT';

export interface OrderAddressSnapshot {
  full_address: string;
  lat: number;
  lng: number;
  city: string;
  lga: string;
  instructions: string | null;
}

export interface OrderDocument {
  id: string;
  order_number: string;             // "CR-20240115-0042"
  user_id: string;
  address: OrderAddressSnapshot;
  zone_id: string;
  status: OrderStatus;

  // Pricing (ALL in kobo — integers only)
  subtotal: number;
  delivery_fee: number;             // Customer-facing delivery charge
  logistics_cost: number;           // INTERNAL — never expose to customer
  delivery_spread: number;          // delivery_fee - logistics_cost
  service_charge: number;           // Ring-fenced for fleet fund
  vat_rate: number;                 // percent, e.g. 7.5
  vat_amount: number;               // kobo — 7.5% of subtotal
  total_amount: number;             // subtotal + delivery_fee + service_charge + vat_amount

  // Delivery
  delivery_date: Timestamp;
  delivery_type: DeliveryType;
  delivery_notes: string | null;

  // Payment
  payment_reference: string | null;
  payment_status: PaymentStatus;
  payment_channel: string | null;
  paid_at: Timestamp | null;

  // Logistics
  logistics_provider: string | null;
  logistics_order_id: string | null;
  tracking_url: string | null;

  // Metadata
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OrderItemDocument {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;             // Snapshot — immutable after order placed
  product_type: ProductType;
  kg_quantity: number;
  price_per_kg: number;             // Snapshot in Naira
  line_total: number;               // kg_quantity * price_per_kg in kobo
}

export interface OrderStatusHistoryDocument {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  actor: string;                    // user_id or "system" or "paystack_webhook"
  created_at: Timestamp;
}

/** Valid state machine transitions */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT:   ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING:        ['AWAITING_PICKUP', 'CANCELLED'],
  AWAITING_PICKUP:   ['IN_TRANSIT'],
  IN_TRANSIT:        ['DELIVERED', 'FAILED_DELIVERY'],
  DELIVERED:         [],
  CANCELLED:         [],
  FAILED_DELIVERY:   [],
};
