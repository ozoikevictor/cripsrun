/**
 * Checkout API — creates order + initializes Paystack payment.
 *
 * Flow:
 * 1. Validate auth
 * 2. Validate inputs with Zod
 * 3. Validate products (stock, min_kg, max_kg)
 * 4. Calculate pricing (kobo)
 * 5. Create order in Firestore (PENDING_PAYMENT)
 * 6. Initialize Paystack transaction
 * 7. Return payment URL + access_code
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/server';
import { CreateOrderSchema } from '@/lib/validators/order.schema';
import { calculateOrderPricing } from '@/lib/pricing/calculator';
import { createOrder, generateOrderNumber } from '@/lib/firestore/orders';
import { initializePaystackTransaction } from '@/lib/paystack/client';
import { validateDeliveryDate } from '@/lib/scheduling/validator';

const DELIVERY_FEE = 200_000; // ₦2,000
const BASE_LOGISTICS_COST = 150_000; // internal logistics cost
const DEFAULT_SERVICE_CHARGE = 50_000; // ₦500
const DEFAULT_MIN_ORDER_VALUE = 300_000; // ₦3,000
const DEFAULT_ZONE_ID = 'flat-delivery';

export async function POST(request: NextRequest) {
  // 1. Auth
  const user = await authenticateRequest(request.headers);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Validate input
  const body = await request.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { address, delivery_date, delivery_type, delivery_notes, items } = parsed.data;

  try {
    const { db } = await import('@/lib/firebase/admin');

    // 3. Validate delivery date against perishable cutoffs (SERVER-SIDE — mandatory)
    const dateValidation = await validateDeliveryDate(
      items.map((i) => ({ product_id: i.product_id, kg_quantity: i.kg_quantity })),
      delivery_date
    );
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, error: dateValidation.error },
        { status: 400 }
      );
    }

    // 4. Validate products + calculate subtotal
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productSnap = await db.collection('products').doc(item.product_id).get();
      if (!productSnap.exists || !productSnap.data()?.is_active) {
        return NextResponse.json(
          { success: false, error: `Product ${item.product_id} is unavailable` },
          { status: 400 }
        );
      }

      const rawProduct = productSnap.data()!;
      const productName = rawProduct.name ?? 'Unknown product';
      const productType = rawProduct.product_type ?? 'REGULAR';
      const pricePerKg = typeof rawProduct.price_per_kg === 'number' ? rawProduct.price_per_kg : 0;
      const minKg = typeof rawProduct.min_kg === 'number' ? rawProduct.min_kg : 0;
      const maxKg = typeof rawProduct.max_kg === 'number' ? rawProduct.max_kg : undefined;
      const stockKg = typeof rawProduct.stock_kg === 'number' ? rawProduct.stock_kg : 0;

      // Enforce minimum kg (per-product, NEVER global default)
      if (item.kg_quantity < minKg) {
        return NextResponse.json({
          success: false,
          error: `Minimum order for "${productName}" is ${minKg}kg`,
        }, { status: 400 });
      }

      // Enforce maximum kg
      if (maxKg !== undefined && item.kg_quantity > maxKg) {
        return NextResponse.json({
          success: false,
          error: `Maximum order for "${productName}" is ${maxKg}kg`,
        }, { status: 400 });
      }

      // Check stock
      if (item.kg_quantity > stockKg) {
        return NextResponse.json({
          success: false,
          error: `Only ${stockKg}kg of "${productName}" available`,
        }, { status: 400 });
      }

      const lineTotal = Math.round(item.kg_quantity * pricePerKg * 100);
      subtotal += lineTotal;

      orderItems.push({
        product_id: item.product_id,
        product_name: productName,
        product_type: productType,
        kg_quantity: item.kg_quantity,
        price_per_kg: pricePerKg,
        line_total: lineTotal,
      });
    }

    const settingsSnapshot = await db.collection('settings').doc('platform').get();
    const pricingSettings = settingsSnapshot.data()?.pricing;
    const minimumOrderValue = Number(pricingSettings?.min_order_value ?? DEFAULT_MIN_ORDER_VALUE);
    const serviceCharge = Number(pricingSettings?.default_service_charge ?? DEFAULT_SERVICE_CHARGE);

    if (subtotal < minimumOrderValue) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum order value is ₦${(minimumOrderValue / 100).toLocaleString('en-NG')}`,
        },
        { status: 400 }
      );
    }

    // 5. Calculate pricing using flat delivery fees
    const pricing = calculateOrderPricing({
      subtotal,
      zone: {
        customer_delivery_fee: DELIVERY_FEE,
        base_logistics_cost: BASE_LOGISTICS_COST,
        service_charge: serviceCharge,
      },
    });

    // 6. Fetch user data
    const userSnap = await db.collection('users').doc(user.uid).get();
    const userData = userSnap.data()!;

    // 7. Create order
    const orderNumber = generateOrderNumber();
    const orderId = await createOrder(
      {
        order_number: orderNumber,
        user_id: user.uid,
        user_email: user.email ?? userData.email ?? '',
        address: {
          full_address: address.full_address,
          lat: 0,
          lng: 0,
          city: address.city ?? '',
          lga: address.lga ?? '',
          instructions: address.instructions ?? null,
        },
        zone_id: DEFAULT_ZONE_ID,
        status: 'PENDING_PAYMENT',
        subtotal: pricing.subtotal,
        delivery_fee: pricing.delivery_fee,
        logistics_cost: pricing.logistics_cost,
        delivery_spread: pricing.delivery_spread,
        service_charge: pricing.service_charge,
        vat_rate: pricing.vat_rate,
        vat_amount: pricing.vat_amount,
        total_amount: pricing.total_amount,
        delivery_date: new Date(delivery_date),
        delivery_type: delivery_type as 'SINGLE' | 'SPLIT',
        delivery_notes: delivery_notes ?? null,
        payment_reference: null,
        payment_status: 'PENDING',
        payment_channel: null,
        paid_at: null,
        logistics_provider: null,
        logistics_order_id: null,
        tracking_url: null,
      },
      orderItems
    );

    const { createAdminOrderCreatedNotifications } = await import('@/lib/notifications/in-app');
    createAdminOrderCreatedNotifications(orderId).catch((notificationError) => {
      console.error('[Checkout API] Admin order notification failed:', notificationError);
    });

    // 8. Initialize Paystack
    const paystackRef = `CR_${orderId}_${Date.now()}`;
    const paystackResult = await initializePaystackTransaction({
      email: userData.email,
      amount: pricing.total_amount,   // kobo
      reference: paystackRef,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        custom_fields: [
          { display_name: 'Order Number', variable_name: 'order_number', value: orderNumber },
        ],
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?payment=success`,
    });

    // Store payment reference
    await db.collection('orders').doc(orderId).update({
      payment_reference: paystackRef,
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        payment_url: paystackResult.data.authorization_url,
        access_code: paystackResult.data.access_code,
        total_amount: pricing.total_amount,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Checkout API] Error:', error);
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
