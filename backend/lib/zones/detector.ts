/**
 * Delivery Zone Detector.
 * Matches an address to an active delivery zone by LGA, area name, or coordinates.
 *
 * SECURITY: This module returns zone_id, customer_delivery_fee, service_charge.
 * It does NOT return logistics_cost or delivery_spread — those are INTERNAL.
 */

interface AddressComponents {
  city?: string;
  lga?: string;         // Local Government Area
  area?: string;        // Neighbourhood / area name
  lat?: number;
  lng?: number;
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
 * Priority: 1) LGA match, 2) Area name match.
 */
export async function detectDeliveryZone(
  address: AddressComponents
): Promise<ZoneDetectionResult> {
  const { db } = await import('@/lib/firebase/admin');

  const zonesSnap = await db
    .collection('delivery_zones')
    .where('is_active', '==', true)
    .get();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zones = zonesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  // Priority 1: LGA match
  if (address.lga) {
    const lgaMatch = zones.find(
      (z: { lgas: string[] }) =>
        z.lgas?.some(
          (lga: string) => lga.toLowerCase() === address.lga!.toLowerCase()
        )
    );
    if (lgaMatch) return buildResult(lgaMatch);
  }

  // Priority 2: Area match
  if (address.area) {
    const areaMatch = zones.find(
      (z: { areas: string[] }) =>
        z.areas?.some(
          (area: string) =>
            area.toLowerCase().includes(address.area!.toLowerCase()) ||
            address.area!.toLowerCase().includes(area.toLowerCase())
        )
    );
    if (areaMatch) return buildResult(areaMatch);
  }

  // Not serviceable
  return {
    zone_id: null,
    zone_name: null,
    customer_delivery_fee: null,
    service_charge: null,
    estimated_delivery_minutes: null,
    is_serviceable: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
