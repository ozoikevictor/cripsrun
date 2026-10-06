import type {
  DispatchRequest,
  DispatchResult,
  ILogisticsProvider,
  TrackingResult,
} from '../types';

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export class OwnFleetProvider implements ILogisticsProvider {
  name = 'own_fleet' as const;

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const providerOrderId = `CR-RIDER-${request.order_id.slice(0, 8).toUpperCase()}`;

    return {
      success: true,
      provider_order_id: providerOrderId,
      tracking_url: `${getAppUrl()}/track/${request.order_id}`,
      estimated_pickup_minutes: 10,
      estimated_delivery_minutes: 45,
    };
  }

  async track(_providerOrderId: string): Promise<TrackingResult> {
    return {
      status: 'in_transit',
      message: 'CrispRun rider is moving toward the delivery address.',
      updated_at: new Date(),
    };
  }

  async cancel(_providerOrderId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}
