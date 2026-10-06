/**
 * Admin Dispatch API.
 * POST: Dispatches an order to a courier via the logistics provider factory.
 * Transitions order: PAYMENT_CONFIRMED → PROCESSING.
 *
 * MANDATORY: Admin role check before any processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { dispatchWithFailover } from '@/lib/logistics/factory';
import { transitionOrderStatus } from '@/lib/firestore/orders';

export async function POST(
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

  const orderId = params.id;

  try {
    const { db } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');
    const storeSettingsSnapshot = await db.collection('settings').doc('platform').get();
    const storeSettings = storeSettingsSnapshot.data()?.store;
    if (
      !storeSettings?.address ||
      !storeSettings?.phone ||
      !Number.isFinite(storeSettings?.lat) ||
      !Number.isFinite(storeSettings?.lng) ||
      (storeSettings.lat === 0 && storeSettings.lng === 0)
    ) {
      return NextResponse.json(
        { success: false, error: 'Set the store pickup address, phone, latitude, and longitude in Admin Settings before dispatching.' },
        { status: 400 }
      );
    }

    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderSnap.data()!;

    if (order.status !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json(
        { success: false, error: `Cannot dispatch order in status: ${order.status}` },
        { status: 400 }
      );
    }

    // Fetch order items for manifest
    const itemsSnap = await db
      .collection('orders')
      .doc(orderId)
      .collection('items')
      .get();

    const items = itemsSnap.docs.map((d) => {
      const item = d.data();
      return {
        name: item.product_name,
        quantity: 1,
        weight_kg: item.kg_quantity,
      };
    });

    // Fetch customer contact
    const userSnap = await db.collection('users').doc(order.user_id).get();
    const customerData = userSnap.data();

    // Dispatch with failover
    const { result, provider } = await dispatchWithFailover({
      order_id: orderId,
      order_number: order.order_number,
      pickup: {
        address: storeSettings.address,
        lat: storeSettings.lat,
        lng: storeSettings.lng,
        contact_name: storeSettings.name ?? 'CrispRun',
        contact_phone: storeSettings.phone,
      },
      dropoff: {
        address: order.address.full_address,
        lat: order.address.lat,
        lng: order.address.lng,
        contact_name: customerData?.full_name ?? 'Customer',
        contact_phone: customerData?.phone ?? '',
        instructions: order.delivery_notes ?? undefined,
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

    // Transition: PAYMENT_CONFIRMED → PROCESSING
    await transitionOrderStatus(
      orderId,
      'PROCESSING',
      user.uid,
      `Dispatched via ${provider}`
    );

    // Trigger notifications (wrapped — NEVER crash order processing)
    try {
      const { triggerOrderNotifications } = await import('@/lib/notifications');
      await triggerOrderNotifications(orderId, 'PROCESSING');
    } catch (notifError) {
      console.error('[Notifications] Failed (non-fatal):', notifError);
    }

    return NextResponse.json({
      success: true,
      data: {
        provider,
        tracking_url: result.tracking_url,
        estimated_delivery_minutes: result.estimated_delivery_minutes,
      },
      message: `Order dispatched via ${provider}`,
    });
  } catch (error) {
    console.error('[Admin Dispatch] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Dispatch failed' },
      { status: 500 }
    );
  }
}
