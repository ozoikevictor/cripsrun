const records = new Map();
const ref = path => ({ path, collection: name => ({ doc: id => ref(path + '/' + name + '/' + id) }) });
const db = {
  collection: name => ({ doc: id => ref(name + '/' + id), where: () => ({ limit: () => ({ get: async () => ({ size: 1, empty: false, docs: [{ id: 'order1', data: () => records.get('orders/order1') }] }) }) }) }),
  runTransaction: jest.fn(async callback => {
    const writes = [];
    const value = await callback({
      get: async reference => ({ exists: records.has(reference.path), data: () => records.get(reference.path) }),
      update: (reference, data) => writes.push(() => records.set(reference.path, { ...records.get(reference.path), ...data })),
      create: (reference, data) => writes.push(() => { if (records.has(reference.path)) throw new Error('Already exists'); records.set(reference.path, data); }),
      set: (reference, data) => writes.push(() => records.set(reference.path, data)),
    });
    writes.forEach(write => write());
    return value;
  }),
};
jest.mock('@/lib/firebase/admin', () => ({ db }));
jest.mock('@/lib/notifications', () => ({ triggerOrderNotifications: jest.fn() }));
jest.mock('@/lib/paystack/client', () => ({ verifyPaystackTransaction: jest.fn() }));
jest.mock('@/lib/auth/server', () => ({ authenticateRequest: jest.fn() }));
const { authenticateRequest } = require('@/lib/auth/server');
const { verifyPaystackTransaction } = require('@/lib/paystack/client');
const { GET: verifyPayment } = require('@/app/api/payments/verify/[reference]/route');
const { validatePayment, settleVerifiedPayment } = require('@/lib/paystack/settlement');
const { verifyPaystackSignature } = require('@/lib/paystack/signature');
const crypto = require('crypto');
const order = { user_id: 'customer', order_number: 'CR-test', status: 'PENDING_PAYMENT', total_amount: 100000, subtotal: 90000, payment_status: 'PENDING', payment_reference: 'CR_reference', currency: 'NGN' };
const payment = { status: 'success', reference: 'CR_reference', amount: 100000, currency: 'NGN', channel: 'card', paid_at: '2026-10-07T12:00:00Z', metadata: { order_id: 'order1' } };
beforeEach(() => { records.clear(); records.set('orders/order1', { ...order }); db.runTransaction.mockClear(); });
test('verified payment writes one atomic payment, history, and revenue record', async () => {
  expect((await settleVerifiedPayment('order1', payment, 'webhook')).applied).toBe(true);
  expect(records.get('orders/order1').payment_status).toBe('SUCCESS');
  expect(records.get('orders/order1').status).toBe('PAYMENT_CONFIRMED');
  expect(records.get('payments/CR_reference').amount).toBe(100000);
  expect(records.has('orders/order1/status_history/payment-confirmed')).toBe(true);
  expect(records.has('revenue_records/order1')).toBe(true);
});
test.each([
  { status: 'failed' }, { amount: 1 }, { amount: 100000.5 },
  { currency: 'USD' }, { reference: 'other' }, { metadata: { order_id: 'other' } }, { paid_at: 'invalid' },
])('rejects an invalid provider result without writing: %j', async changes => {
  await expect(settleVerifiedPayment('order1', { ...payment, ...changes }, 'webhook')).rejects.toThrow();
  expect(records.size).toBe(1);
  expect(records.get('orders/order1').payment_status).toBe('PENDING');
});
test('duplicate webhook and verification cannot create duplicate records or reset processing', async () => {
  await settleVerifiedPayment('order1', payment, 'webhook');
  records.get('orders/order1').status = 'PROCESSING';
  const count = records.size;
  expect((await settleVerifiedPayment('order1', payment, 'customer')).applied).toBe(false);
  expect(records.size).toBe(count);
  expect(records.get('orders/order1').status).toBe('PROCESSING');
});
test('a payment cannot be assigned to two orders', async () => {
  records.set('payments/CR_reference', { order_id: 'other' });
  await expect(settleVerifiedPayment('order1', payment, 'webhook')).rejects.toThrow('another order');
  expect(records.get('orders/order1').payment_status).toBe('PENDING');
});
test('cancelled orders cannot be changed to paid through verification', async () => {
  records.get('orders/order1').status = 'CANCELLED';
  await expect(settleVerifiedPayment('order1', payment, 'webhook')).rejects.toThrow('current state');
});
test('webhook signatures use the exact raw body and reject malformed signatures', () => {
  const previous = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = 'test-secret';
  try {
    const body = JSON.stringify({ event: 'charge.success' });
    const signature = crypto.createHmac('sha512', 'test-secret').update(body).digest('hex');
    expect(verifyPaystackSignature(body, signature)).toBe(true);
    expect(verifyPaystackSignature(body + ' ', signature)).toBe(false);
    expect(verifyPaystackSignature(body, 'fake')).toBe(false);
  } finally { if (previous === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previous; }
});
test('another customer cannot verify or inspect the order payment', async () => {
  authenticateRequest.mockResolvedValue({ uid: 'other-customer', role: 'customer' });
  verifyPaystackTransaction.mockClear();
  const response = await verifyPayment({ headers: new Headers() }, { params: { reference: 'CR_reference' } });
  expect(response.status).toBe(403);
  expect(verifyPaystackTransaction).not.toHaveBeenCalled();
});
test('unauthenticated payment verification is rejected', async () => {
  authenticateRequest.mockResolvedValue(null);
  expect((await verifyPayment({ headers: new Headers() }, { params: { reference: 'CR_reference' } })).status).toBe(401);
});
