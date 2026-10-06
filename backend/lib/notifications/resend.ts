/**
 * Resend email client.
 * Sends transactional emails via Resend (resend.com).
 */

import type { EmailPayload } from './templates';
import { renderOrderEmailHTML } from './email-renderer';

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Resend] No API key configured — skipping email to', payload.to);
    return;
  }

  const html = renderOrderEmailHTML(payload.templateName, payload.templateData);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `CrispRun <${process.env.RESEND_FROM_EMAIL ?? 'orders@crisprun.ng'}>`,
      to: [payload.to],
      subject: payload.subject,
      html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Resend email failed: ${JSON.stringify(data)}`);
  }

  console.log(`[Resend] Email sent to ${payload.to}`);
}
