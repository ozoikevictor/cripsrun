import type { ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult } from '../types';

export class UberDirectProvider implements ILogisticsProvider {
  name = 'uber_direct' as const;
  private clientId = process.env.UBER_DIRECT_CLIENT_ID!;
  private clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET!;
  private baseUrl = 'https://api.uber.com/v1/eats/deliveries';
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token;

    const response = await fetch('https://login.uber.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'eats.deliveries',
      }),
    });

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.token!;
  }

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    try {
      const token = await this.getToken();

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup: {
            name: request.pickup.contact_name,
            phone_number: request.pickup.contact_phone,
            address: {
              street_address: [request.pickup.address],
              city: 'Lagos',
              country: 'NG',
            },
            latitude: request.pickup.lat,
            longitude: request.pickup.lng,
          },
          dropoff: {
            name: request.dropoff.contact_name,
            phone_number: request.dropoff.contact_phone,
            address: {
              street_address: [request.dropoff.address],
              city: 'Lagos',
              country: 'NG',
            },
            latitude: request.dropoff.lat,
            longitude: request.dropoff.lng,
            notes: request.dropoff.instructions,
          },
          manifest: {
            reference: request.order_number,
            description: request.items.map(i => `${i.name} (${i.weight_kg}kg)`).join(', '),
            total_value: request.declared_value,
          },
        }),
      });

      const data = await response.json();

      return response.ok
        ? {
            success: true,
            provider_order_id: data.id,
            tracking_url: data.tracking_url ?? null,
            estimated_pickup_minutes: data.pickup_eta ?? 25,
            estimated_delivery_minutes: data.dropoff_eta ?? 60,
          }
        : {
            success: false,
            provider_order_id: '',
            tracking_url: null,
            estimated_pickup_minutes: 0,
            estimated_delivery_minutes: 0,
            error: data.message,
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
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}/${provider_order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return {
      status: data.status === 'delivered' ? 'delivered' : 'in_transit',
      message: data.status,
      updated_at: new Date(),
    };
  }

  async cancel(provider_order_id: string): Promise<{ success: boolean }> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}/${provider_order_id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: response.ok };
  }
}
