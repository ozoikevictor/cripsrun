import type { ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult } from '../types';

export class GokadaProvider implements ILogisticsProvider {
  name = 'gokada' as const;
  private apiKey = process.env.GOKADA_API_KEY!;
  private baseUrl = 'https://api.gokada.ng/v1';

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_address: request.pickup.address,
          pickup_latitude: request.pickup.lat,
          pickup_longitude: request.pickup.lng,
          pickup_contact_name: request.pickup.contact_name,
          pickup_contact_phone: request.pickup.contact_phone,
          delivery_address: request.dropoff.address,
          delivery_latitude: request.dropoff.lat,
          delivery_longitude: request.dropoff.lng,
          delivery_contact_name: request.dropoff.contact_name,
          delivery_contact_phone: request.dropoff.contact_phone,
          delivery_notes: request.dropoff.instructions,
          order_reference: request.order_number,
          declared_value: request.declared_value / 100,  // kobo → Naira
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider_order_id: '',
          tracking_url: null,
          estimated_pickup_minutes: 0,
          estimated_delivery_minutes: 0,
          error: data.message ?? 'Gokada dispatch failed',
        };
      }

      return {
        success: true,
        provider_order_id: data.order_id ?? data.id,
        tracking_url: data.tracking_url ?? null,
        estimated_pickup_minutes: data.estimated_pickup_time ?? 20,
        estimated_delivery_minutes: data.estimated_delivery_time ?? 60,
      };
    } catch (error) {
      return {
        success: false,
        provider_order_id: '',
        tracking_url: null,
        estimated_pickup_minutes: 0,
        estimated_delivery_minutes: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async track(provider_order_id: string): Promise<TrackingResult> {
    const response = await fetch(`${this.baseUrl}/orders/${provider_order_id}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const data = await response.json();

    return {
      status: this.mapStatus(data.status),
      message: data.status_message ?? data.status,
      updated_at: new Date(data.updated_at),
    };
  }

  async cancel(provider_order_id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/orders/${provider_order_id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return { success: response.ok };
  }

  private mapStatus(status: string): TrackingResult['status'] {
    const map: Record<string, TrackingResult['status']> = {
      pending: 'pending',
      accepted: 'accepted',
      pickup: 'pickup',
      in_transit: 'in_transit',
      delivered: 'delivered',
      cancelled: 'failed',
      failed: 'failed',
    };
    return map[status.toLowerCase()] ?? 'pending';
  }
}
