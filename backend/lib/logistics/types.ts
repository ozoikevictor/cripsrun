export type LogisticsProviderName =
  | 'gokada'
  | 'uber_direct'
  | 'bolt_food'
  | 'glovo'
  | 'own_fleet';        // Phase 2

export interface DispatchRequest {
  order_id: string;
  order_number: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
    contact_name: string;
    contact_phone: string;
  };
  dropoff: {
    address: string;
    lat: number;
    lng: number;
    contact_name: string;
    contact_phone: string;
    instructions?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    weight_kg: number;
  }>;
  declared_value: number;       // kobo — for insurance
  notes?: string;
}

export interface DispatchResult {
  success: boolean;
  provider_order_id: string;
  tracking_url: string | null;
  estimated_pickup_minutes: number;
  estimated_delivery_minutes: number;
  error?: string;
}

export interface TrackingResult {
  status: 'pending' | 'accepted' | 'pickup' | 'in_transit' | 'delivered' | 'failed';
  current_location?: { lat: number; lng: number };
  message: string;
  updated_at: Date;
}

/** All logistics providers implement this interface */
export interface ILogisticsProvider {
  name: LogisticsProviderName;
  dispatch(request: DispatchRequest): Promise<DispatchResult>;
  track(provider_order_id: string): Promise<TrackingResult>;
  cancel(provider_order_id: string): Promise<{ success: boolean }>;
}
