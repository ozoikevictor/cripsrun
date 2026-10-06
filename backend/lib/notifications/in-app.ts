import type { OrderStatus } from '@/types/order.types';

const STATUS_COPY: Record<OrderStatus, { title: string; message: string }> = {
  PENDING_PAYMENT: {
    title: 'Order created',
    message: 'Your order has been created and is waiting for payment.',
  },
  PAYMENT_CONFIRMED: {
    title: 'Payment confirmed',
    message: 'Your payment has been confirmed. We will start processing your order.',
  },
  PROCESSING: {
    title: 'Order processing',
    message: 'Your order is now being packed by the CrispRun team.',
  },
  AWAITING_PICKUP: {
    title: 'Order ready for pickup',
    message: 'Your order is ready and waiting for the rider to collect it.',
  },
  IN_TRANSIT: {
    title: 'Order on the way',
    message: 'Your order is on the way to your delivery address.',
  },
  DELIVERED: {
    title: 'Order delivered',
    message: 'Your order has been delivered. Thank you for shopping with CrispRun.',
  },
  CANCELLED: {
    title: 'Order cancelled',
    message: 'This order has been cancelled.',
  },
  FAILED_DELIVERY: {
    title: 'Delivery issue',
    message: 'We could not complete this delivery. Please contact support.',
  },
};

export async function createOrderNotification(orderId: string, status: OrderStatus) {
  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');

  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) return;

  const order = orderSnap.data()!;
  const copy = STATUS_COPY[status];

  const notificationRef = db.collection('notifications').doc(`order-${orderId}-${status}-${order.user_id}`);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(notificationRef);
    if (existing.exists) return;
    transaction.create(notificationRef, {
      user_id: order.user_id,
      order_id: orderId,
      order_number: order.order_number ?? null,
      type: 'ORDER_STATUS',
      status,
      title: copy.title,
      message: `${copy.message}${order.order_number ? ` Order ${order.order_number}.` : ''}`,
      read: false,
      created_at: FieldValue.serverTimestamp(),
    });
  });
}

export async function createAdminPaidOrderNotifications(orderId: string) {
  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) return;

  const order = orderSnap.data()!;
  const [adminsSnapshot, customerSnapshot] = await Promise.all([
    db.collection('users').where('role', '==', 'admin').get(),
    db.collection('users').doc(order.user_id).get(),
  ]);
  if (adminsSnapshot.empty) return;

  const customerName = customerSnapshot.data()?.full_name ?? order.customer_name ?? 'A customer';
  const amount = Math.round(Number(order.total_amount ?? 0) / 100).toLocaleString('en-NG');
  await Promise.all(adminsSnapshot.docs.map(async (admin) => {
    const notificationRef = db.collection('notifications').doc(`admin-paid-${orderId}-${admin.id}`);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(notificationRef);
      if (existing.exists) return;
      transaction.create(notificationRef, {
        user_id: admin.id,
        order_id: orderId,
        order_number: order.order_number ?? null,
        type: 'ADMIN_NEW_PAID_ORDER',
        status: 'PAYMENT_CONFIRMED',
        title: 'New order paid',
        message: `${customerName} paid ₦${amount} for order ${order.order_number ?? orderId}. Prepare the order for dispatch.`,
        read: false,
        created_at: FieldValue.serverTimestamp(),
      });
    });
  }));
}

export async function createAdminOrderCreatedNotifications(orderId: string) {
  const { db } = await import('@/lib/firebase/admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) return;

  const order = orderSnap.data()!;
  const [adminsSnapshot, customerSnapshot] = await Promise.all([
    db.collection('users').where('role', '==', 'admin').get(),
    db.collection('users').doc(order.user_id).get(),
  ]);
  if (adminsSnapshot.empty) return;

  const customerName = customerSnapshot.data()?.full_name ?? order.customer_name ?? 'A customer';
  await Promise.all(adminsSnapshot.docs.map(async (admin) => {
    const notificationRef = db.collection('notifications').doc(`admin-created-${orderId}-${admin.id}`);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(notificationRef);
      if (existing.exists) return;
      transaction.create(notificationRef, {
        user_id: admin.id,
        order_id: orderId,
        order_number: order.order_number ?? null,
        type: 'ADMIN_ORDER_CREATED',
        status: 'PENDING_PAYMENT',
        title: 'New order placed',
        message: `${customerName} placed order ${order.order_number ?? orderId}. Waiting for payment confirmation.`,
        read: false,
        created_at: FieldValue.serverTimestamp(),
      });
    });
  }));
}
