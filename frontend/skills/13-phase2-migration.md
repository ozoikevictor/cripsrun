# Skill 13 — Phase 2 Migration Guide
## Third-Party Logistics → Own Motorcycle Fleet

> Use this skill when: planning the Phase 2 launch, building the rider app,
> migrating logistics config, or activating the own-fleet provider.

---

## Overview

Phase 1 and Phase 2 share the same order processing pipeline.
The ONLY change at launch is: swap the active logistics provider.

The `OwnFleetProvider` plug-in point already exists in:
`lib/logistics/providers/own-fleet.ts` (skeleton from Skill 07)

---

## Phase 2 Prerequisites Checklist

Before activating Phase 2:

### Legal & Operations
- [ ] Company registered (CAC) — logistics entity may need separate registration
- [ ] Motorcycles acquired and insured
- [ ] Riders employed and NSITF/pension contributions set up
- [ ] Vehicle tracking devices installed on all motorcycles
- [ ] Rider training completed (safety + app usage)
- [ ] Rider uniforms, helmets, and branded delivery bags procured

### Financial Gate
- [ ] Fleet fund balance (ring-fenced service charges) is sufficient to cover:
  - Motorcycle cost × fleet size
  - 3 months rider salaries
  - Fuel and maintenance float
  - Branded equipment
- [ ] Check via `/ring-fence-audit` workflow

### Technical
- [ ] Rider mobile app built and tested (see below)
- [ ] `own-fleet` provider fully implemented in `lib/logistics/providers/own-fleet.ts`
- [ ] `rider_assignments` Firestore collection and security rules deployed
- [ ] Real-time tracking integration confirmed working
- [ ] End-to-end test: order → dispatch → rider accepts → in-transit → delivered

---

## Firestore Collections for Phase 2

### `rider_assignments/{assignmentId}`
```typescript
{
  id: string;
  order_id: string;
  order_number: string;
  status: 'pending' | 'accepted' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled';
  rider_id: string | null;          // null until a rider accepts
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
  items: Array<{ name: string; quantity: number; weight_kg: number }>;
  rider_location: { lat: number; lng: number } | null;   // Real-time updates
  accepted_at: Timestamp | null;
  picked_up_at: Timestamp | null;
  delivered_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### `riders/{riderId}`
```typescript
{
  id: string;
  full_name: string;
  phone: string;                    // E.164 format
  email: string;
  motorcycle_plate: string;
  is_active: boolean;
  is_available: boolean;            // Currently on shift and available
  current_location: { lat: number; lng: number } | null;
  active_assignment_id: string | null;
  total_deliveries: number;
  joined_at: Timestamp;
}
```

---

## Own Fleet Provider (Complete Implementation)

### `lib/logistics/providers/own-fleet.ts`
```typescript
import type {
  ILogisticsProvider, DispatchRequest, DispatchResult, TrackingResult
} from '../types';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export class OwnFleetProvider implements ILogisticsProvider {
  name = 'own_fleet' as const;

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    try {
      // Check rider availability
      const availableRiders = await db.collection('riders')
        .where('is_active', '==', true)
        .where('is_available', '==', true)
        .where('active_assignment_id', '==', null)
        .limit(5)
        .get();

      if (availableRiders.empty) {
        return {
          success: false,
          provider_order_id: '',
          tracking_url: null,
          estimated_pickup_minutes: 0,
          estimated_delivery_minutes: 0,
          error: 'No riders available at this time. Switching to third-party courier.',
        };
      }

      // Create assignment — riders pick from a pool (first-come-first-served)
      const assignmentRef = db.collection('rider_assignments').doc();

      await assignmentRef.set({
        id: assignmentRef.id,
        order_id: request.order_id,
        order_number: request.order_number,
        status: 'pending',
        rider_id: null,
        pickup: request.pickup,
        dropoff: request.dropoff,
        items: request.items,
        rider_location: null,
        accepted_at: null,
        picked_up_at: null,
        delivered_at: null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        provider_order_id: assignmentRef.id,
        tracking_url: `${process.env.NEXT_PUBLIC_APP_URL}/track/${request.order_id}`,
        estimated_pickup_minutes: 15,
        estimated_delivery_minutes: 45,
      };
    } catch (error) {
      return {
        success: false,
        provider_order_id: '',
        tracking_url: null,
        estimated_pickup_minutes: 0,
        estimated_delivery_minutes: 0,
        error: error instanceof Error ? error.message : 'Own fleet dispatch failed',
      };
    }
  }

  async track(provider_order_id: string): Promise<TrackingResult> {
    const snap = await db.collection('rider_assignments').doc(provider_order_id).get();

    if (!snap.exists) {
      return { status: 'pending', message: 'Assignment not found', updated_at: new Date() };
    }

    const data = snap.data()!;

    return {
      status: data.status,
      current_location: data.rider_location ?? undefined,
      message: this.statusMessage(data.status),
      updated_at: data.updated_at?.toDate() ?? new Date(),
    };
  }

  async cancel(provider_order_id: string): Promise<{ success: boolean }> {
    try {
      const snap = await db.collection('rider_assignments').doc(provider_order_id).get();
      if (!snap.exists) return { success: false };

      const data = snap.data()!;

      // Can only cancel if not yet picked up
      if (['pending', 'accepted'].includes(data.status)) {
        await db.collection('rider_assignments').doc(provider_order_id).update({
          status: 'cancelled',
          updated_at: FieldValue.serverTimestamp(),
        });

        // Free up the rider if one had accepted
        if (data.rider_id) {
          await db.collection('riders').doc(data.rider_id).update({
            is_available: true,
            active_assignment_id: null,
          });
        }

        return { success: true };
      }

      return { success: false };
    } catch {
      return { success: false };
    }
  }

  private statusMessage(status: string): string {
    const messages: Record<string, string> = {
      pending: 'Waiting for a rider to accept',
      accepted: 'Rider confirmed — heading to pickup',
      pickup: 'Rider is at the store collecting your order',
      in_transit: 'Rider is on the way to you',
      delivered: 'Order delivered',
      cancelled: 'Assignment cancelled',
    };
    return messages[status] ?? status;
  }
}
```

---

## Rider Mobile App (React Native)

### Key Screens
```
1. Login (phone OTP)
2. Home / Status Toggle (Available / Unavailable)
3. Incoming Assignment (order details, accept/decline button)
4. Active Delivery (pickup address → confirm pickup → dropoff → confirm delivery)
5. Real-time location update (every 30 seconds while on delivery)
6. Delivery History
```

### Real-Time Location Update (Rider App)
```typescript
// Rider app sends location update every 30 seconds during active delivery
async function updateRiderLocation(assignmentId: string, lat: number, lng: number) {
  const batch = db.batch();

  // Update assignment
  const assignmentRef = db.collection('rider_assignments').doc(assignmentId);
  batch.update(assignmentRef, {
    rider_location: { lat, lng },
    updated_at: FieldValue.serverTimestamp(),
  });

  // Update rider profile
  const riderRef = db.collection('riders').doc(currentRiderId);
  batch.update(riderRef, {
    current_location: { lat, lng },
  });

  await batch.commit();
}
```

### Customer Real-Time Tracking Page
```typescript
// app/(customer)/track/[orderId]/page.tsx
// Uses Firestore onSnapshot to watch rider_assignments in real-time
// Shows Google Maps with rider pin moving live
// No polling needed — Firestore handles real-time updates
```

---

## Activation Steps (Cut-Over Day)

### Step 1: Register Own Fleet in Factory
In `lib/logistics/factory.ts`:
```typescript
import { OwnFleetProvider } from './providers/own-fleet';

// Add to providers map:
providers.own_fleet = new OwnFleetProvider();
```

### Step 2: Update Firestore Config
Update `config/logistics` document:
```typescript
{
  active_providers: ['own_fleet', 'gokada'],   // own_fleet first, gokada as fallback
  default_provider: 'own_fleet',
  fallback_enabled: true,                       // Falls back to Gokada if no riders available
  phase: 2,
  phase_2_launch_date: Timestamp.now(),
}
```

### Step 3: Deploy Firestore Rules for Rider Collections
Add to `firestore.rules`:
```javascript
match /rider_assignments/{assignmentId} {
  allow read: if isAdmin() ||
    (isAuthenticated() &&
     get(/databases/$(database)/documents/riders/$(request.auth.uid)).data.is_active == true);
  allow write: if false; // Written by server only
}

match /riders/{riderId} {
  allow read: if isAdmin() || isOwner(riderId);
  allow update: if isOwner(riderId) &&
    request.resource.data.keys().hasOnly(['is_available', 'current_location', 'active_assignment_id']);
  allow create, delete: if isAdmin();
}
```

### Step 4: Deploy and Verify
```bash
firebase deploy --only firestore:rules
vercel --prod
```

Test:
- Create a test order
- Confirm it goes to `rider_assignments` collection (not Gokada)
- Accept it on the rider app
- Confirm order status moves to AWAITING_PICKUP
- Mark as picked up → confirm IN_TRANSIT
- Mark as delivered → confirm DELIVERED
- Check revenue_record exists

### Step 5: Notify Customers
Update email/SMS templates to remove references to "Gokada" or third-party branding.
Update delivery time estimates if own-fleet is faster/slower than couriers.

---

## Revenue Impact of Phase 2

When Phase 2 launches:
- Platform no longer pays Gokada/Uber per order
- `logistics_cost` becomes: rider salary prorated per delivery + fuel + depreciation
- `delivery_spread` increases significantly (most of the delivery fee becomes margin)
- The ring-fenced fleet fund transitions: ongoing fleet maintenance budget instead

Update `config/pricing` and all zone `base_logistics_cost` values to reflect
actual internal cost per zone after Phase 2 is operational for 30 days.
