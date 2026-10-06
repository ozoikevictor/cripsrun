/**
 * Zone Detection API — public endpoint for checkout.
 * Returns zone pricing (customer-facing only).
 * NEVER exposes logistics_cost or delivery_spread.
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectDeliveryZone } from '@/lib/zones/detector';
import { z } from 'zod';

const DetectSchema = z.object({
  lga: z.string().optional(),
  area: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = DetectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input' },
      { status: 422 }
    );
  }

  try {
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
  } catch (error) {
    console.error('[Zone Detect] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Zone detection failed' },
      { status: 500 }
    );
  }
}
