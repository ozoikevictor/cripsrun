# Skill 07 — Logistics Integration

> Use this skill when: dispatching orders to couriers, switching providers, checking
> delivery status, or building the Phase 1→Phase 2 fleet transition logic.

---

## Architecture: Provider Abstraction Layer

The logistics system is built behind an **interface/factory pattern** so that:
- Phase 1: Gokada, Uber Direct, Bolt, Glovo are interchangeable
- Phase 2: The proprietary fleet plugs in as just another "provider"
- Switching providers requires ZERO changes to order processing code

```
Order dispatched
      │
      ▼
LogisticsFactory.getProvider(zone_id, order)
      │
      ▼
Selected Provider (Gokada | UberDirect | Bolt | Glovo | OwnFleet)
      │
      ▼
Returns: { provider_order_id, tracking_url, estimated_minutes }
```

---

## Core Types

### `lib/logistics/types.ts`
```typescript
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
```

---

## Provider Implementations

### `lib/logistics/providers/gokada.ts`
```typescript
import type { ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult } from '../types';

export class GokadaProvider implements ILogisticsProvider {
  name = 'gokada' as const;
  private apiKey = process.env.GOKADA_API_KEY!;
  private baseUrl = 'https://api.gokada.ng/v1';  // Update with actual Gokada API URL

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
          declared_value: request.declared_value / 100,  // Convert from kobo to Naira
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
```

### `lib/logistics/providers/uber-direct.ts`
```typescript
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

      const response = await fetch(`${this.baseUrl}`, {
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
```

### `lib/logistics/providers/stub-providers.ts`
```typescript
// Bolt Food and Glovo — implement the same interface pattern as Gokada/Uber above.
// Stub implementations below: replace with real API calls when credentials are obtained.

import type { ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult } from '../types';

export class BoltFoodProvider implements ILogisticsProvider {
  name = 'bolt_food' as const;
  private apiKey = process.env.BOLT_API_KEY!;

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    // TODO: Replace with Bolt Food Delivery API when available in Nigeria
    // Reference: https://developers.bolt.eu/docs/delivery
    throw new Error('Bolt Food provider not yet configured. Set BOLT_API_KEY and implement.');
  }

  async track(provider_order_id: string): Promise<TrackingResult> {
    throw new Error('Bolt Food tracking not yet configured.');
  }

  async cancel(provider_order_id: string): Promise<{ success: boolean }> {
    throw new Error('Bolt Food cancellation not yet configured.');
  }
}

export class GlovoProvider implements ILogisticsProvider {
  name = 'glovo' as const;
  private apiKey = process.env.GLOVO_API_KEY!;

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    // TODO: Replace with Glovo API when available in target city
    // Reference: https://api.glovoapp.com/docs
    throw new Error('Glovo provider not yet configured.');
  }

  async track(provider_order_id: string): Promise<TrackingResult> {
    throw new Error('Glovo tracking not yet configured.');
  }

  async cancel(provider_order_id: string): Promise<{ success: boolean }> {
    throw new Error('Glovo cancellation not yet configured.');
  }
}
```

---

## Logistics Factory

### `lib/logistics/factory.ts`
```typescript
import { GokadaProvider } from './providers/gokada';
import { UberDirectProvider } from './providers/uber-direct';
import { BoltFoodProvider } from './providers/stub-providers';
import { GlovoProvider } from './providers/stub-providers';
import type { ILogisticsProvider, LogisticsProviderName } from './types';
import { db } from '@/lib/firebase/admin';

const providers: Record<LogisticsProviderName, ILogisticsProvider> = {
  gokada: new GokadaProvider(),
  uber_direct: new UberDirectProvider(),
  bolt_food: new BoltFoodProvider(),
  glovo: new GlovoProvider(),
  own_fleet: null!,  // Injected in Phase 2
};

interface ProviderConfig {
  active_providers: LogisticsProviderName[];   // Priority order
  default_provider: LogisticsProviderName;
  fallback_enabled: boolean;
}

/**
 * Get the best available provider for an order.
 * Admin configures priority in Firestore: config/logistics
 * Falls back down the priority list on failure.
 */
export async function getLogisticsProvider(
  preferredProvider?: LogisticsProviderName
): Promise<ILogisticsProvider> {
  if (preferredProvider && providers[preferredProvider]) {
    return providers[preferredProvider];
  }

  // Read admin-configured priority from Firestore
  const configSnap = await db.collection('config').doc('logistics').get();
  const config = configSnap.data() as ProviderConfig | undefined;

  const defaultProvider = config?.default_provider ?? 'gokada';
  return providers[defaultProvider];
}

/**
 * Dispatch with automatic failover.
 * Tries providers in priority order until one succeeds.
 */
export async function dispatchWithFailover(
  request: import('./types').DispatchRequest,
  maxAttempts = 2
): Promise<{ result: import('./types').DispatchResult; provider: LogisticsProviderName }> {
  const configSnap = await db.collection('config').doc('logistics').get();
  const config = configSnap.data() as ProviderConfig | undefined;
  const priorityList = config?.active_providers ?? ['gokada', 'uber_direct'];

  let lastError: string = '';

  for (let i = 0; i < Math.min(maxAttempts, priorityList.length); i++) {
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
    provider: priorityList[0],
  };
}
```

---

## Dispatch Order API (Admin triggers this)

### `app/api/admin/orders/[id]/dispatch/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { dispatchWithFailover } from '@/lib/logistics/factory';
import { transitionOrderStatus } from '@/lib/firestore/orders';
import { triggerOrderNotifications } from '@/lib/notifications';

const STORE_PICKUP = {
  address: '12 Store Street, Ikorodu, Lagos',  // TODO: Update with real store address
  lat: 6.6194,
  lng: 3.5106,
  contact_name: 'CrispRun',
  contact_phone: process.env.STORE_PHONE ?? '+2348012345678',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const orderId = params.id;
  const orderSnap = await db.collection('orders').doc(orderId).get();

  if (!orderSnap.exists) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  const order = orderSnap.data()!;

  if (order.status !== 'PAYMENT_CONFIRMED') {
    return NextResponse.json(
      { success: false, error: `Cannot dispatch order in status: ${order.status}` },
      { status: 400 }
    );
  }

  // Fetch order items for manifest
  const itemsSnap = await db.collection('orders').doc(orderId)
    .collection('items').get();
  const items = itemsSnap.docs.map(d => {
    const item = d.data();
    return {
      name: item.product_name,
      quantity: 1,
      weight_kg: item.kg_quantity,
    };
  });

  // Dispatch
  const { result, provider } = await dispatchWithFailover({
    order_id: orderId,
    order_number: order.order_number,
    pickup: STORE_PICKUP,
    dropoff: {
      address: order.address.full_address,
      lat: order.address.lat,
      lng: order.address.lng,
      contact_name: (await db.collection('users').doc(order.user_id).get()).data()?.full_name ?? 'Customer',
      contact_phone: (await db.collection('users').doc(order.user_id).get()).data()?.phone ?? '',
      instructions: order.address.instructions ?? undefined,
    },
    items,
    declared_value: order.subtotal,
    notes: order.delivery_notes ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'Dispatch failed' },
      { status: 500 }
    );
  }

  // Update order with logistics info
  await db.collection('orders').doc(orderId).update({
    logistics_provider: provider,
    logistics_order_id: result.provider_order_id,
    tracking_url: result.tracking_url,
    updated_at: FieldValue.serverTimestamp(),
  });

  await transitionOrderStatus(orderId, 'PROCESSING', user.uid,
    `Dispatched via ${provider}`
  );

  await triggerOrderNotifications(orderId, 'PROCESSING');

  return NextResponse.json({
    success: true,
    data: {
      provider,
      tracking_url: result.tracking_url,
      estimated_delivery_minutes: result.estimated_delivery_minutes,
    },
    message: `Order dispatched via ${provider}`,
  });
}
```

---

## Phase 2: Own Fleet Plug-in Point

When Phase 2 is ready, create `lib/logistics/providers/own-fleet.ts`:

```typescript
// lib/logistics/providers/own-fleet.ts  (Phase 2 — skeleton)
import type { ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult } from '../types';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export class OwnFleetProvider implements ILogisticsProvider {
  name = 'own_fleet' as const;

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    // Write to internal rider_assignments collection
    // Rider app picks it up in real-time via Firestore listener
    const assignmentRef = db.collection('rider_assignments').doc();
    await assignmentRef.set({
      id: assignmentRef.id,
      order_id: request.order_id,
      order_number: request.order_number,
      pickup: request.pickup,
      dropoff: request.dropoff,
      items: request.items,
      status: 'pending',
      rider_id: null,           // Rider accepts from pool
      created_at: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      provider_order_id: assignmentRef.id,
      tracking_url: `/track/${request.order_id}`,  // Internal tracking
      estimated_pickup_minutes: 15,
      estimated_delivery_minutes: 45,
    };
  }

  async track(provider_order_id: string): Promise<TrackingResult> {
    const snap = await db.collection('rider_assignments').doc(provider_order_id).get();
    const data = snap.data()!;
    return {
      status: data.status,
      current_location: data.rider_location,
      message: data.status_message ?? data.status,
      updated_at: data.updated_at?.toDate() ?? new Date(),
    };
  }

  async cancel(provider_order_id: string): Promise<{ success: boolean }> {
    await db.collection('rider_assignments').doc(provider_order_id).update({
      status: 'cancelled',
      updated_at: FieldValue.serverTimestamp(),
    });
    return { success: true };
  }
}

// Register in factory.ts:
// import { OwnFleetProvider } from './providers/own-fleet';
// providers.own_fleet = new OwnFleetProvider();
```

---

## Admin Logistics Config (Firestore Document)

```typescript
// config/logistics document structure — editable via admin panel
{
  active_providers: ['gokada', 'uber_direct'],  // Priority order
  default_provider: 'gokada',
  fallback_enabled: true,
  phase: 1,                                     // Update to 2 when own fleet launches
  phase_2_target_date: null,
  store_address: {
    full_address: '12 Store Street, Ikorodu, Lagos',
    lat: 6.6194,
    lng: 3.5106,
    phone: '+2348012345678',
  },
}
```
