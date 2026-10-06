/**
 * Admin Order Status Transition API.
 * PUT: Transitions an order to a new status via the state machine.
 *
 * MANDATORY: Admin role check before any processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { transitionOrderStatus } from '@/lib/firestore/orders';
import { z } from 'zod';

const TransitionSchema = z.object({
  new_status: z.enum([
    'PAYMENT_CONFIRMED',
    'PROCESSING',
    'AWAITING_PICKUP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'FAILED_DELIVERY',
  ]),
  note: z.string().max(500).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // MANDATORY admin guard
  const user = await authenticateRequest(request.headers);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = TransitionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await transitionOrderStatus(
      params.id,
      parsed.data.new_status,
      user.uid,
      parsed.data.note
    );

    // Trigger notifications (wrapped in try/catch — NEVER crash order processing)
    try {
      const { triggerOrderNotifications } = await import('@/lib/notifications');
      await triggerOrderNotifications(params.id, parsed.data.new_status);
    } catch (notifError) {
      console.error('[Notifications] Failed (non-fatal):', notifError);
    }

    return NextResponse.json({
      success: true,
      message: `Order transitioned to ${parsed.data.new_status}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transition failed';

    // State machine validation errors return 400
    if (message.includes('Invalid transition')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    console.error('[Admin Status API] Error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
