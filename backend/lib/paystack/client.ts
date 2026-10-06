/**
 * Paystack server-side API wrapper.
 * SECURITY: Uses PAYSTACK_SECRET_KEY — server-only, never in client bundle.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return key;
}

async function paystackRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Paystack API error: ${data.message ?? response.statusText}`);
  }

  return data;
}

/** Initialize a Paystack transaction */
export async function initializePaystackTransaction(params: {
  email: string;
  amount: number;           // in kobo (integer)
  reference: string;
  metadata?: object;
  callback_url?: string;
  channels?: string[];
}) {
  return paystackRequest<{
    status: boolean;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }>('POST', '/transaction/initialize', {
    ...params,
    channels: params.channels ?? ['card', 'bank', 'ussd', 'bank_transfer'],
  });
}

/** Verify a Paystack transaction by reference */
export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<{
    status: boolean;
    data: {
      status: string;         // "success" | "failed" | "abandoned"
      reference: string;
      amount: number;         // kobo
      channel: string;
      currency: string;
      paid_at: string;
      metadata: Record<string, unknown>;
    };
  }>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Initiate a refund */
export async function refundPaystackTransaction(params: {
  transaction_reference: string;
  amount?: number;           // kobo — omit for full refund
  merchant_note?: string;
}) {
  return paystackRequest('POST', '/refund', params);
}
