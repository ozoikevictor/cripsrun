/**
 * Termii SMS client.
 * Sends transactional SMS via Termii API (termii.com).
 * Normalizes Nigerian phone numbers to international format.
 */

const TERMII_BASE = 'https://api.ng.termii.com/api';

interface SMSParams {
  to: string;         // E.164 format: +2348012345678
  message: string;
  senderId?: string;
}

export async function sendSMS({ to, message, senderId }: SMSParams): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.log('[Termii] No API key configured — skipping SMS to', normalizePhone(to));
    return;
  }

  const response = await fetch(`${TERMII_BASE}/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: normalizePhone(to),
      from: senderId ?? process.env.TERMII_SENDER_ID ?? 'CrispRun',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: apiKey,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Termii SMS failed: ${JSON.stringify(data)}`);
  }

  console.log(`[Termii] SMS sent to ${normalizePhone(to)}`);
}

/** Normalize Nigerian phone numbers to international format */
function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('234')) return `+${clean}`;
  if (clean.startsWith('0') && clean.length === 11) return `+234${clean.slice(1)}`;
  if (clean.length === 10) return `+234${clean}`;
  return phone;  // return as-is if already formatted
}
