# Skill 10 — Notifications (SMS + Email)

> Use this skill when: triggering order status notifications, building SMS/email templates,
> or adding any notification touch point.

---

## Architecture

Every order status change fires:
1. **SMS** via Termii → customer's phone number
2. **Email** via Resend → customer's email address

All notification triggers pass through a single `triggerOrderNotifications()` function
called from order status transition points. This is the ONLY entry point.

---

## Notification Trigger Function

### `lib/notifications/index.ts`
```typescript
import { db } from '@/lib/firebase/admin';
import { sendSMS } from './termii';
import { sendEmail } from './resend';
import {
  buildSMSMessage,
  buildEmailPayload,
  NOTIFIABLE_STATUSES,
} from './templates';
import type { OrderStatus } from '@/types/order.types';

/**
 * Main notification dispatch function.
 * Call this after every order status transition.
 */
export async function triggerOrderNotifications(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  // Only notify on statuses that matter to the customer
  if (!NOTIFIABLE_STATUSES.includes(newStatus)) return;

  try {
    // Fetch order + user in parallel
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) return;

    const order = orderSnap.data()!;
    const userSnap = await db.collection('users').doc(order.user_id).get();
    if (!userSnap.exists) return;

    const user = userSnap.data()!;

    // Build messages
    const smsMessage = buildSMSMessage(newStatus, order);
    const emailPayload = buildEmailPayload(newStatus, order, user);

    // Fire SMS + Email concurrently (non-blocking — don't throw on failure)
    await Promise.allSettled([
      sendSMS({ to: user.phone, message: smsMessage }),
      sendEmail(emailPayload),
    ]);

    // Log notification attempt
    await db.collection('orders').doc(orderId)
      .collection('notifications').add({
        status: newStatus,
        sms_to: user.phone,
        email_to: user.email,
        sent_at: new Date(),
      });

  } catch (error) {
    // Notifications must NEVER crash order processing
    console.error(`[Notifications] Failed for order ${orderId}:`, error);
  }
}
```

---

## SMS Templates

### `lib/notifications/templates.ts`
```typescript
import type { OrderStatus } from '@/types/order.types';
import { formatCurrency } from '@/lib/utils/format';

export const NOTIFIABLE_STATUSES: OrderStatus[] = [
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'AWAITING_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'FAILED_DELIVERY',
];

const APP_NAME = 'CrispRun';
const SUPPORT_PHONE = process.env.SUPPORT_PHONE ?? '08012345678';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crisprun.ng';

export function buildSMSMessage(status: OrderStatus, order: any): string {
  const templates: Partial<Record<OrderStatus, string>> = {
    PAYMENT_CONFIRMED: [
      `Hi! Your ${APP_NAME} order ${order.order_number} is confirmed.`,
      `We're preparing your items for delivery on ${formatDeliveryDate(order.delivery_date)}.`,
      `Track: ${APP_URL}/orders/${order.id}`,
    ].join(' '),

    PROCESSING: [
      `Your ${APP_NAME} order ${order.order_number} is being packed and will be dispatched soon.`,
      `Delivery: ${formatDeliveryDate(order.delivery_date)}.`,
    ].join(' '),

    AWAITING_PICKUP: [
      `Great news! Your ${APP_NAME} order ${order.order_number} is packed and ready.`,
      `A rider is on the way to pick it up.`,
    ].join(' '),

    IN_TRANSIT: [
      `Your ${APP_NAME} order ${order.order_number} is on its way!`,
      order.tracking_url
        ? `Track your rider: ${order.tracking_url}`
        : `Expect delivery shortly.`,
    ].join(' '),

    DELIVERED: [
      `Your ${APP_NAME} order ${order.order_number} has been delivered!`,
      `Thank you for shopping with us. Questions? Call ${SUPPORT_PHONE}.`,
    ].join(' '),

    CANCELLED: [
      `Your ${APP_NAME} order ${order.order_number} has been cancelled.`,
      order.payment_status === 'SUCCESS'
        ? `A refund will be processed within 3–5 business days. Questions? Call ${SUPPORT_PHONE}.`
        : `No charge was made.`,
    ].join(' '),

    FAILED_DELIVERY: [
      `We were unable to deliver your ${APP_NAME} order ${order.order_number}.`,
      `Our team will contact you shortly to reschedule. Sorry for the inconvenience.`,
      `Call us: ${SUPPORT_PHONE}.`,
    ].join(' '),
  };

  return templates[status] ?? `Your ${APP_NAME} order ${order.order_number} has been updated. Status: ${status}.`;
}

export interface EmailPayload {
  to: string;
  subject: string;
  templateData: Record<string, any>;
  templateName: string;
}

export function buildEmailPayload(
  status: OrderStatus,
  order: any,
  user: any
): EmailPayload {
  const subjects: Partial<Record<OrderStatus, string>> = {
    PAYMENT_CONFIRMED: `Order Confirmed — ${order.order_number}`,
    PROCESSING:        `Your Order is Being Prepared — ${order.order_number}`,
    AWAITING_PICKUP:   `Rider on the Way — ${order.order_number}`,
    IN_TRANSIT:        `Your Order is Out for Delivery — ${order.order_number}`,
    DELIVERED:         `Delivered! — ${order.order_number}`,
    CANCELLED:         `Order Cancelled — ${order.order_number}`,
    FAILED_DELIVERY:   `Delivery Issue — ${order.order_number}`,
  };

  return {
    to: user.email,
    subject: subjects[status] ?? `Order Update — ${order.order_number}`,
    templateName: `order-${status.toLowerCase().replace(/_/g, '-')}`,
    templateData: {
      customer_name: user.full_name,
      order_number: order.order_number,
      order_id: order.id,
      delivery_address: order.address.full_address,
      delivery_date: formatDeliveryDate(order.delivery_date),
      total_amount: formatCurrency(order.total_amount),
      tracking_url: order.tracking_url,
      order_url: `${APP_URL}/orders/${order.id}`,
      support_phone: SUPPORT_PHONE,
      payment_status: order.payment_status,
    },
  };
}

function formatDeliveryDate(timestamp: any): string {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-NG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}
```

---

## Termii SMS Client

### `lib/notifications/termii.ts`
```typescript
const TERMII_BASE = 'https://api.ng.termii.com/api';

interface SMSParams {
  to: string;         // E.164 format: +2348012345678
  message: string;
}

export async function sendSMS({ to, message }: SMSParams): Promise<void> {
  const response = await fetch(`${TERMII_BASE}/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: normalizePhone(to),
      from: process.env.TERMII_SENDER_ID ?? 'CrispRun',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: process.env.TERMII_API_KEY,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.code === 'ok' === false) {
    throw new Error(`Termii SMS failed: ${JSON.stringify(data)}`);
  }
}

/** Normalize Nigerian phone numbers to international format */
function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('234')) return `+${clean}`;
  if (clean.startsWith('0') && clean.length === 11) return `+234${clean.slice(1)}`;
  if (clean.length === 10) return `+234${clean}`;
  return phone;  // return as-is if already formatted
}
```

---

## Resend Email Client

### `lib/notifications/resend.ts`
```typescript
import { Resend } from 'resend';
import type { EmailPayload } from './templates';
import { renderOrderEmailHTML } from './email-renderer';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const html = renderOrderEmailHTML(payload.templateName, payload.templateData);

  const { error } = await resend.emails.send({
    from: `CrispRun <${process.env.RESEND_FROM_EMAIL ?? 'orders@crisprun.ng'}>`,
    to: [payload.to],
    subject: payload.subject,
    html,
  });

  if (error) {
    throw new Error(`Resend email failed: ${JSON.stringify(error)}`);
  }
}
```

---

## Email Renderer (Inline HTML — No Template Engine Required)

### `lib/notifications/email-renderer.ts`
```typescript
/**
 * Generates inline HTML emails without an external template engine.
 * Simple, dependency-free, works with Resend.
 */
export function renderOrderEmailHTML(
  templateName: string,
  data: Record<string, any>
): string {
  const brand = {
    primary: '#16a34a',    // green-600
    bg: '#f0fdf4',
    text: '#111827',
    muted: '#6b7280',
  };

  const base = (body: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${data.subject ?? 'CrispRun Order Update'}</title>
    </head>
    <body style="font-family: -apple-system, sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background: ${brand.primary}; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🛒 CrispRun</h1>
        </div>
        <!-- Body -->
        <div style="padding: 32px;">
          ${body}
        </div>
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: ${brand.muted}; font-size: 12px; margin: 0;">
            CrispRun — Fresh Food Delivered.<br>
            Need help? Call <a href="tel:${data.support_phone}">${data.support_phone}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const orderBox = `
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 14px; color: #374151;">
        <strong>Order:</strong> ${data.order_number}
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #374151;">
        <strong>Delivery Date:</strong> ${data.delivery_date}
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #374151;">
        <strong>Delivery Address:</strong> ${data.delivery_address}
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #374151;">
        <strong>Total Paid:</strong> ${data.total_amount}
      </p>
    </div>
  `;

  const ctaButton = (label: string, url: string) => `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}"
         style="background: ${brand.primary}; color: white; padding: 12px 28px;
                border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        ${label}
      </a>
    </div>
  `;

  const templates: Record<string, string> = {
    'order-payment_confirmed': base(`
      <h2 style="color: #111827;">Hi ${data.customer_name}, your order is confirmed! 🎉</h2>
      <p style="color: #374151;">We've received your payment and your order is being prepared.</p>
      ${orderBox}
      ${ctaButton('Track My Order', data.order_url)}
    `),

    'order-in_transit': base(`
      <h2 style="color: #111827;">Your order is on the way! 🚴</h2>
      <p style="color: #374151;">Hi ${data.customer_name}, your order is out for delivery.</p>
      ${orderBox}
      ${data.tracking_url
        ? ctaButton('Track My Rider', data.tracking_url)
        : ctaButton('View Order', data.order_url)
      }
    `),

    'order-delivered': base(`
      <h2 style="color: #111827;">Delivered! Thank you ${data.customer_name} 🎊</h2>
      <p style="color: #374151;">
        Your order ${data.order_number} has been delivered. Enjoy your food!
      </p>
      <p style="color: #374151; margin-top: 16px;">We'd love to see you again soon.</p>
      ${ctaButton('Shop Again', '${process.env.NEXT_PUBLIC_APP_URL}/catalog')}
    `),

    'order-cancelled': base(`
      <h2 style="color: #111827;">Order Cancelled</h2>
      <p style="color: #374151;">Hi ${data.customer_name}, your order ${data.order_number} has been cancelled.</p>
      ${data.payment_status === 'SUCCESS'
        ? '<p style="color: #374151;">A full refund will be processed within <strong>3–5 business days</strong>.</p>'
        : '<p style="color: #374151;">No charge was made to your account.</p>'
      }
      <p style="color: #6b7280; font-size: 14px;">If this was a mistake, please contact us.</p>
    `),
  };

  // Fallback template
  return templates[templateName] ?? base(`
    <h2 style="color: #111827;">Order Update</h2>
    <p style="color: #374151;">Hi ${data.customer_name}, your order ${data.order_number} has been updated.</p>
    ${orderBox}
    ${ctaButton('View Order', data.order_url)}
  `);
}
```

---

## Admin Manual Notification (Resend Bulk)

```typescript
// app/api/admin/notifications/broadcast/route.ts
// Send a custom SMS or email to all customers who ordered in a date range.
// Usage: admin broadcasts a service downtime or special offer announcement.

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { message, channel } = await request.json(); // channel: 'sms' | 'email' | 'both'

  // Fetch active customer phones/emails
  const usersSnap = await db.collection('users')
    .where('role', '==', 'customer')
    .where('is_active', '==', true)
    .get();

  const users = usersSnap.docs.map(d => d.data());

  // Queue in batches of 50 (Termii bulk endpoint)
  // Implementation depends on Termii bulk SMS API
  // ...

  return NextResponse.json({
    success: true,
    message: `Broadcast queued for ${users.length} customers`,
  });
}
```
