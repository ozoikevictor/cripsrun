/**
 * Inline HTML email renderer — no template engine dependency.
 * Generates branded order status emails for Resend.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderOrderEmailHTML(
  templateName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crisprun.ng';

  const templates: Record<string, string> = {
    'order-payment-confirmed': base(`
      <h2 style="color: #111827;">Hi ${data.customer_name}, your order is confirmed! 🎉</h2>
      <p style="color: #374151;">We've received your payment and your order is being prepared.</p>
      ${orderBox}
      ${ctaButton('Track My Order', data.order_url)}
    `),

    'order-processing': base(`
      <h2 style="color: #111827;">Your order is being prepared 🍖</h2>
      <p style="color: #374151;">Hi ${data.customer_name}, we're packing your items with care.</p>
      ${orderBox}
      ${ctaButton('View Order', data.order_url)}
    `),

    'order-awaiting-pickup': base(`
      <h2 style="color: #111827;">A rider is coming! 🏍️</h2>
      <p style="color: #374151;">Hi ${data.customer_name}, your order is packed and a rider is heading to pick it up.</p>
      ${orderBox}
      ${ctaButton('View Order', data.order_url)}
    `),

    'order-in-transit': base(`
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
      ${ctaButton('Shop Again', `${appUrl}/catalog`)}
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

    'order-failed-delivery': base(`
      <h2 style="color: #111827;">Delivery Issue ⚠️</h2>
      <p style="color: #374151;">Hi ${data.customer_name}, we were unable to deliver your order ${data.order_number}.</p>
      <p style="color: #374151;">Our team will contact you shortly to reschedule delivery.</p>
      ${ctaButton('View Order', data.order_url)}
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
