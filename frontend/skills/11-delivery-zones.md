# Skill 11 — Delivery Zones

> Use this skill when: building zone CRUD, address validation at checkout,
> zone detection from coordinates, or the admin zone management page.

---

## Core Concept

Delivery zones define:
- Which areas the platform serves
- The **customer-facing delivery fee** per zone (what customer sees)
- The **internal logistics cost** per zone (what platform pays courier — NEVER shown to customer)
- The **delivery spread** (fee minus cost = platform margin)
- The **service charge** amount (₦500–₦1,000)
- Estimated delivery time in minutes

All zone financial fields are in **kobo**.

---

## Zone CRUD API

### `app/api/admin/zones/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { z } from 'zod';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const ZoneSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  lgas: z.array(z.string()).min(1),
  areas: z.array(z.string()),
  // All kobo values
  base_logistics_cost: z.number().int().positive(),      // Internal — never shown to customer
  customer_delivery_fee: z.number().int().positive(),    // Customer-facing
  service_charge: z.number().int().min(50000).max(200000), // ₦500–₦2,000 range
  estimated_delivery_minutes: z.number().int().min(10).max(480),
  is_active: z.boolean().default(true),
}).refine(
  data => data.customer_delivery_fee > data.base_logistics_cost,
  { message: 'Customer delivery fee must exceed logistics cost (spread must be positive)' }
);

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = ZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      success: false, error: 'Validation failed', details: parsed.error.flatten()
    }, { status: 422 });
  }

  const data = parsed.data;
  const deliverySpread = data.customer_delivery_fee - data.base_logistics_cost;

  const ref = db.collection('delivery_zones').doc();
  await ref.set({
    ...data,
    id: ref.id,
    delivery_spread: deliverySpread,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    success: true,
    data: { id: ref.id, delivery_spread: deliverySpread },
    message: 'Zone created',
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let q = db.collection('delivery_zones').orderBy('name', 'asc');
  if (activeOnly) q = q.where('is_active', '==', true) as any;

  const snap = await q.get();

  // Strip internal logistics_cost and delivery_spread from non-admin responses
  const zones = snap.docs.map(d => {
    const zone = d.data();
    if (!user || user.role !== 'admin') {
      const { base_logistics_cost, delivery_spread, ...publicZone } = zone;
      return publicZone;
    }
    return zone;
  });

  return NextResponse.json({ success: true, data: zones });
}
```

---

## Zone Detection from Address

### `lib/zones/detector.ts`
```typescript
import { db } from '@/lib/firebase/admin';

interface AddressComponents {
  city?: string;
  lga?: string;         // Local Government Area
  area?: string;        // Neighbourhood / area name
  lat: number;
  lng: number;
}

interface ZoneDetectionResult {
  zone_id: string | null;
  zone_name: string | null;
  customer_delivery_fee: number | null;
  service_charge: number | null;
  estimated_delivery_minutes: number | null;
  is_serviceable: boolean;
}

/**
 * Detect which delivery zone covers a given address.
 * First tries LGA match, then area match.
 * Returns null zone fields if address is outside all active zones.
 */
export async function detectDeliveryZone(
  address: AddressComponents
): Promise<ZoneDetectionResult> {
  const zonesSnap = await db.collection('delivery_zones')
    .where('is_active', '==', true)
    .get();

  const zones = zonesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Priority 1: LGA match
  if (address.lga) {
    const lgaMatch = zones.find(z =>
      z.lgas.some((lga: string) => lga.toLowerCase() === address.lga!.toLowerCase())
    );
    if (lgaMatch) return buildResult(lgaMatch);
  }

  // Priority 2: Area match
  if (address.area) {
    const areaMatch = zones.find(z =>
      z.areas.some((area: string) =>
        area.toLowerCase().includes(address.area!.toLowerCase()) ||
        address.area!.toLowerCase().includes(area.toLowerCase())
      )
    );
    if (areaMatch) return buildResult(areaMatch);
  }

  // Priority 3: Google Distance Matrix (for edge cases)
  // Only call if LGA/area match fails and coordinates are available
  if (address.lat && address.lng) {
    const distanceMatch = await findZoneByDistance(address.lat, address.lng, zones);
    if (distanceMatch) return buildResult(distanceMatch);
  }

  return {
    zone_id: null, zone_name: null,
    customer_delivery_fee: null, service_charge: null,
    estimated_delivery_minutes: null,
    is_serviceable: false,
  };
}

function buildResult(zone: any): ZoneDetectionResult {
  return {
    zone_id: zone.id,
    zone_name: zone.name,
    customer_delivery_fee: zone.customer_delivery_fee,
    service_charge: zone.service_charge,
    estimated_delivery_minutes: zone.estimated_delivery_minutes,
    is_serviceable: true,
  };
}

/** Use Google Distance Matrix as a fallback for zone detection */
async function findZoneByDistance(
  lat: number,
  lng: number,
  zones: any[]
): Promise<any | null> {
  // Store location (origin) — update with real coordinates
  const storeLat = 6.6194;
  const storeLng = 3.5106;

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${storeLat},${storeLng}` +
    `&destinations=${lat},${lng}` +
    `&mode=driving` +
    `&key=${process.env.GOOGLE_MAPS_API_KEY}`
  );

  const data = await response.json();
  const distanceKm = data.rows?.[0]?.elements?.[0]?.distance?.value / 1000;

  if (!distanceKm) return null;

  // Simple distance-based zone assignment
  // Sort zones by estimated delivery time and pick the best fit
  // This is a fallback — proper zone coverage via LGA/area is preferred
  return zones.sort((a, b) => a.estimated_delivery_minutes - b.estimated_delivery_minutes)[0] ?? null;
}
```

---

## Address Autocomplete (Checkout Step 1)

### `components/checkout/AddressInput.tsx`
```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

interface PlaceResult {
  full_address: string;
  lat: number;
  lng: number;
  city: string;
  lga: string;
  area: string;
}

interface AddressInputProps {
  onAddressSelect: (place: PlaceResult & { zone?: any }) => void;
  placeholder?: string;
}

export function AddressInput({ onAddressSelect, placeholder = 'Enter your delivery address' }: AddressInputProps) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const initServices = useCallback(() => {
    if (!window.google) return;
    if (!autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
    if (!placesService.current) {
      const el = document.createElement('div');
      placesService.current = new window.google.maps.places.PlacesService(el);
    }
  }, []);

  const handleInput = (input: string) => {
    setValue(input);
    setZoneError(null);

    clearTimeout(debounceTimer.current);
    if (input.length < 3) { setSuggestions([]); return; }

    debounceTimer.current = setTimeout(() => {
      initServices();
      if (!autocompleteService.current) return;

      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'ng' },
          types: ['geocode', 'establishment'],
          // Bias toward Lagos
          locationBias: {
            center: { lat: 6.5244, lng: 3.3792 },
            radius: 100000,
          },
        },
        (predictions: any[], status: string) => {
          if (status === 'OK') setSuggestions(predictions ?? []);
        }
      );
    }, 350);
  };

  const handleSelect = async (placeId: string, description: string) => {
    setIsLoading(true);
    setSuggestions([]);
    setValue(description);

    placesService.current.getDetails(
      { placeId, fields: ['geometry', 'address_components', 'formatted_address'] },
      async (place: any, status: string) => {
        if (status !== 'OK') { setIsLoading(false); return; }

        const components = place.address_components as Array<{ long_name: string; types: string[] }>;
        const get = (type: string) =>
          components.find(c => c.types.includes(type))?.long_name ?? '';

        const placeResult: PlaceResult = {
          full_address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city: get('locality') || get('sublocality') || get('postal_town'),
          lga: get('administrative_area_level_2'),
          area: get('sublocality_level_1') || get('neighborhood'),
        };

        // Detect delivery zone
        try {
          const response = await fetch('/api/zones/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lga: placeResult.lga,
              area: placeResult.area,
              lat: placeResult.lat,
              lng: placeResult.lng,
            }),
          });
          const data = await response.json();

          if (!data.data?.is_serviceable) {
            setZoneError('Sorry, we don\'t deliver to this area yet. We\'re expanding soon!');
            setIsLoading(false);
            return;
          }

          onAddressSelect({ ...placeResult, zone: data.data });
        } catch {
          setZoneError('Could not verify delivery zone. Please try again.');
        }

        setIsLoading(false);
      }
    );
  };

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg">
          {suggestions.map((s: any) => (
            <button
              key={s.place_id}
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted border-b last:border-0"
              onClick={() => handleSelect(s.place_id, s.description)}
            >
              <p className="font-medium">{s.structured_formatting.main_text}</p>
              <p className="text-xs text-muted-foreground">{s.structured_formatting.secondary_text}</p>
            </button>
          ))}
        </div>
      )}

      {zoneError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{zoneError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

## Zone Detect API

### `app/api/zones/detect/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { detectDeliveryZone } from '@/lib/zones/detector';
import { z } from 'zod';

const DetectSchema = z.object({
  lga: z.string().optional(),
  area: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = DetectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 422 });
  }

  const result = await detectDeliveryZone(parsed.data);

  // NEVER expose base_logistics_cost or delivery_spread to client
  return NextResponse.json({
    success: true,
    data: {
      zone_id: result.zone_id,
      zone_name: result.zone_name,
      customer_delivery_fee: result.customer_delivery_fee,
      service_charge: result.service_charge,
      estimated_delivery_minutes: result.estimated_delivery_minutes,
      is_serviceable: result.is_serviceable,
    },
  });
}
```

---

## Admin Zone Management Page

Key UI components needed:

```typescript
// app/(admin)/zones/page.tsx — features list
const ZONE_ADMIN_FEATURES = [
  'List all zones with fee summary cards',
  'Create zone form with LGA multi-select (all Lagos LGAs)',
  'Internal cost vs customer fee fields (show spread calculation live)',
  'Service charge field with ₦500–₦1,000 validation',
  'Toggle zone active/inactive',
  'Estimated delivery time config',
  'Preview: "Customer sees: ₦3,000 | You pay courier: ₦2,500 | Spread: ₦500"',
];

// Lagos LGAs for the multi-select (seed this into your form)
export const LAGOS_LGAS = [
  'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
  'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
  'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
  'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere',
];
```
