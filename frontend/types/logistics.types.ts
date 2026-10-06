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
    instructions: string | null;
  };
  items: Array<{
    name: string;
    quantity: number;
    weight_kg: number;
  }>;
  package_description: string;
  total_weight_kg: number;
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
  status: string;
  current_location?: {
    lat: number;
    lng: number;
  };
  message: string;
  updated_at: Date;
}

export type LogisticsProviderName =
  | 'gokada'
  | 'uber_direct'
  | 'bolt'
  | 'glovo'
  | 'own_fleet';

export interface ILogisticsProvider {
  name: LogisticsProviderName;
  dispatch(request: DispatchRequest): Promise<DispatchResult>;
  track(providerOrderId: string): Promise<TrackingResult>;
  cancel(providerOrderId: string): Promise<{ success: boolean }>;
}
