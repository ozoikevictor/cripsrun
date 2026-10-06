/**
 * Logistics Factory.
 * Selects and manages courier providers with failover support.
 * Provider priority is configured in Firestore: config/logistics
 */

import { GokadaProvider } from './providers/gokada';
import { UberDirectProvider } from './providers/uber-direct';
import { BoltFoodProvider, GlovoProvider } from './providers/stub-providers';
import { OwnFleetProvider } from './providers/own-fleet';
import type { ILogisticsProvider, LogisticsProviderName, DispatchRequest, DispatchResult } from './types';

const providers: Record<LogisticsProviderName, ILogisticsProvider | null> = {
  gokada: new GokadaProvider(),
  uber_direct: new UberDirectProvider(),
  bolt_food: new BoltFoodProvider(),
  glovo: new GlovoProvider(),
  own_fleet: new OwnFleetProvider(),
};

interface ProviderConfig {
  active_providers: LogisticsProviderName[];   // Priority order
  default_provider: LogisticsProviderName;
  fallback_enabled: boolean;
}

/**
 * Get the best available provider for an order.
 * Admin configures priority in Firestore: config/logistics
 */
export async function getLogisticsProvider(
  preferredProvider?: LogisticsProviderName
): Promise<ILogisticsProvider> {
  if (preferredProvider && providers[preferredProvider]) {
    return providers[preferredProvider]!;
  }

  const { db } = await import('@/lib/firebase/admin');
  const configSnap = await db.collection('config').doc('logistics').get();
  const config = configSnap.data() as ProviderConfig | undefined;

  const defaultProvider = config?.default_provider ?? 'gokada';
  return providers[defaultProvider] ?? new GokadaProvider();
}

/**
 * Dispatch with automatic failover.
 * Tries providers in priority order until one succeeds.
 */
export async function dispatchWithFailover(
  request: DispatchRequest,
  maxAttempts = 2
): Promise<{ result: DispatchResult; provider: LogisticsProviderName }> {
  const { db } = await import('@/lib/firebase/admin');
  const configSnap = await db.collection('config').doc('logistics').get();
  const config = configSnap.data() as ProviderConfig | undefined;
  const configuredProviders = config?.active_providers?.filter((name) => providers[name]) ?? [];
  const configuredDefault = config?.default_provider;
  const primaryProvider = configuredDefault && providers[configuredDefault]
    ? configuredDefault
    : configuredProviders[0] ?? 'gokada';
  const enabledProviders = configuredProviders.length > 0
    ? configuredProviders
    : [primaryProvider];
  const priorityList = [
    primaryProvider,
    ...enabledProviders.filter((name) => name !== primaryProvider),
  ];
  const attemptCount = config?.fallback_enabled === false
    ? 1
    : Math.min(priorityList.length, Math.max(1, maxAttempts));

  let lastError: string = '';

  for (let i = 0; i < attemptCount; i++) {
    const providerName = priorityList[i];
    const provider = providers[providerName];

    if (!provider) continue;

    try {
      const result = await provider.dispatch(request);
      if (result.success) {
        return { result, provider: providerName };
      }
      lastError = result.error ?? 'Unknown failure';
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return {
    result: {
      success: false,
      provider_order_id: '',
      tracking_url: null,
      estimated_pickup_minutes: 0,
      estimated_delivery_minutes: 0,
      error: `All providers failed. Last error: ${lastError}`,
    },
    provider: priorityList[0] ?? 'gokada',
  };
}
