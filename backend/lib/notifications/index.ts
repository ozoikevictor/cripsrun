/**
 * Notification entry point.
 * RULE: All notification calls wrapped in try/catch.
 * Notifications NEVER crash order processing.
 *
 * triggerOrderNotifications() is the ONLY entry point — call after every status transition.
 */

import { sendSMS } from './termii';
import { sendEmail } from './resend';
import {
  buildSMSMessage,
  buildEmailPayload,
  NOTIFIABLE_STATUSES,
} from './templates';
import type { OrderStatus } from '@/types/order.types';
import { createAdminPaidOrderNotifications, createOrderNotification } from './in-app';

/**
 * Trigger notifications for an order status change.
 * This is the ONLY entry point for notifications — call it after every status transition.
 */
export async function triggerOrderNotifications(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  // Only notify on statuses that matter to the customer
  if (!NOTIFIABLE_STATUSES.includes(newStatus)) return;

  try {
    const { db } = await import('@/lib/firebase/admin');
    const settingsSnapshot = await db.collection('settings').doc('platform').get();
    const notificationSettings = settingsSnapshot.data()?.notifications;

    // Fetch order + user
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = { id: orderId, ...orderSnap.data()! } as Record<string, any>;
    const userSnap = await db.collection('users').doc(order.user_id).get();
    if (!userSnap.exists) return;

    const user = userSnap.data()!;

    await createOrderNotification(orderId, newStatus);
    if (newStatus === 'PAYMENT_CONFIRMED') {
      try {
        await createAdminPaidOrderNotifications(orderId);
      } catch (adminNotificationError) {
        console.error('[Notifications] Failed to create admin order alert:', adminNotificationError);
      }
    }

    // Build messages
    const smsMessage = buildSMSMessage(newStatus, order);
    const emailPayload = buildEmailPayload(newStatus, order, user);

    // Fire SMS + Email concurrently (non-blocking — don't throw on failure)
    const shouldSendSms = notificationSettings?.sms_enabled !== false && Boolean(user.phone);
    const shouldSendEmail = notificationSettings?.email_enabled !== false && Boolean(user.email);
    const [smsResult, emailResult] = await Promise.allSettled([
      shouldSendSms ? sendSMS({
        to: user.phone,
        message: smsMessage,
        senderId: notificationSettings?.sender_id,
      }) : Promise.resolve(),
      shouldSendEmail ? sendEmail(emailPayload) : Promise.resolve(),
    ]);

    const smsStatus = shouldSendSms ? smsResult.status : 'skipped';
    const emailStatus = shouldSendEmail ? emailResult.status : 'skipped';

    console.log(
      `[Notifications] Order ${orderId} → ${newStatus}:`,
      `SMS: ${smsStatus}`,
      `Email: ${emailStatus}`
    );

    // Log notification attempt to Firestore
    try {
      const { FieldValue } = await import('firebase-admin/firestore');
      await db.collection('orders').doc(orderId)
        .collection('notifications').add({
          status: newStatus,
          sms_to: user.phone,
          sms_status: smsStatus,
          email_to: user.email,
          email_status: emailStatus,
          sent_at: FieldValue.serverTimestamp(),
        });
    } catch (logError) {
      console.error('[Notifications] Failed to log notification:', logError);
    }

  } catch (error) {
    // CRITICAL: Notifications must NEVER crash order processing
    console.error(`[Notifications] Failed for order ${orderId}:`, error);
  }
}
