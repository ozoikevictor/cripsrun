/**
 * Bolt Food and Glovo — stub implementations.
 * Replace with real API calls when credentials are obtained.
 */

import type { ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult } from '../types';

export class BoltFoodProvider implements ILogisticsProvider {
  name = 'bolt_food' as const;

  async dispatch(_request: DispatchRequest): Promise<DispatchResult> {
    // TODO: Replace with Bolt Food Delivery API when available in Nigeria
    return {
      success: false,
      provider_order_id: '',
      tracking_url: null,
      estimated_pickup_minutes: 0,
      estimated_delivery_minutes: 0,
      error: 'Bolt Food provider not yet configured. Set BOLT_API_KEY and implement.',
    };
  }

  async track(_provider_order_id: string): Promise<TrackingResult> {
    return {
      status: 'pending',
      message: 'Bolt Food tracking not yet configured.',
      updated_at: new Date(),
    };
  }

  async cancel(_provider_order_id: string): Promise<{ success: boolean }> {
    return { success: false };
  }
}

export class GlovoProvider implements ILogisticsProvider {
  name = 'glovo' as const;

  async dispatch(_request: DispatchRequest): Promise<DispatchResult> {
    // TODO: Replace with Glovo API when available in target city
    return {
      success: false,
      provider_order_id: '',
      tracking_url: null,
      estimated_pickup_minutes: 0,
      estimated_delivery_minutes: 0,
      error: 'Glovo provider not yet configured.',
    };
  }

  async track(_provider_order_id: string): Promise<TrackingResult> {
    return {
      status: 'pending',
      message: 'Glovo tracking not yet configured.',
      updated_at: new Date(),
    };
  }

  async cancel(_provider_order_id: string): Promise<{ success: boolean }> {
    return { success: false };
  }
}
