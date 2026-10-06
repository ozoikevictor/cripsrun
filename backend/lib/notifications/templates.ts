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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateData: Record<string, any>;
  templateName: string;
}

export function buildEmailPayload(
  status: OrderStatus,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDeliveryDate(timestamp: any): string {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-NG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}
