const mockAuth = { createSessionCookie: jest.fn(), verifySessionCookie: jest.fn(), verifyIdToken: jest.fn() };
const mockCookies = { get: jest.fn(), delete: jest.fn(), set: jest.fn() };
let mockDays = [];
jest.mock('@/lib/firebase/admin', () => ({ auth: mockAuth, db: { collection: name => ({ doc: () => ({ get: async () => ({ exists: true, data: () => name === 'products' ? { name: 'Green Beans', product_type: 'PERISHABLE' } : { role: 'customer' } }), collection: () => ({ get: async () => ({ empty: !mockDays.length, docs: mockDays.map(day => ({ data: () => day })) }) }) }) }) } }));
jest.mock('next/headers', () => ({ cookies: () => mockCookies }));
const { createSessionCookie, verifySessionCookie } = require('../../../backend/lib/auth/cookie');
const { GET, DELETE } = require('../../../backend/app/api/auth/session/route');
const { validateDeliveryDate } = require('../../../backend/lib/scheduling/validator');

beforeEach(() => {
  jest.clearAllMocks();
  mockCookies.get.mockReturnValue({ value: 'test-session-cookie' });
});
test('creates a five-day server session rather than storing the short-lived ID token', async () => {
  mockAuth.createSessionCookie.mockResolvedValue('signed-cookie');
  expect(await createSessionCookie('id-token')).toBe('signed-cookie');
  expect(mockAuth.createSessionCookie).toHaveBeenCalledWith('id-token', { expiresIn: 432000000 });
});
test('verifies session revocation and supports still-valid legacy tokens', async () => {
  mockAuth.verifySessionCookie.mockRejectedValueOnce({ code: 'auth/argument-error' });
  mockAuth.verifyIdToken.mockResolvedValueOnce({ uid: 'customer' });
  expect(await verifySessionCookie('legacy-token')).toEqual({ uid: 'customer' });
  expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('legacy-token', true);
});
test('temporary verification failure returns 503 without deleting the cookie', async () => {
  mockAuth.verifySessionCookie.mockRejectedValueOnce({ code: 'auth/internal-error' });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const response = await GET();
  expect(response.status).toBe(503);
  expect(mockCookies.delete).not.toHaveBeenCalled();
  log.mockRestore();
});
test('expired sessions are cleared and require login', async () => {
  mockAuth.verifySessionCookie.mockRejectedValueOnce({ code: 'auth/session-cookie-expired' });
  expect((await GET()).status).toBe(401);
  expect(mockCookies.delete).toHaveBeenCalledWith('session');
});
test('explicit logout clears the browser session', async () => {
  expect((await DELETE()).status).toBe(200);
  expect(mockCookies.delete).toHaveBeenCalledWith('session');
});

describe('server delivery schedule enforcement', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2098-12-30T12:00:00Z')); mockDays = []; });
  afterEach(() => jest.useRealTimers());
  test('rejects missing schedules without inventing delivery days', async () => {
    const result = await validateDeliveryDate([{ product_id: 'beans', kg_quantity: 1 }], '2099-01-01T00:00:00Z');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no delivery days configured');
  });
  test('accepts configured delivery days before the Lagos cutoff', async () => {
    mockDays = [{ day_of_week: 4, cutoff_hours: 24 }];
    expect((await validateDeliveryDate([{ product_id: 'beans', kg_quantity: 1 }], '2099-01-01T00:00:00Z')).valid).toBe(true);
  });
  test('rejects orders after the configured cutoff', async () => {
    mockDays = [{ day_of_week: 4, cutoff_hours: 24 }];
    jest.setSystemTime(new Date('2098-12-31T12:00:00Z'));
    expect((await validateDeliveryDate([{ product_id: 'beans', kg_quantity: 1 }], '2099-01-01T00:00:00Z')).valid).toBe(false);
  });
  test('rejects malformed dates', async () => {
    expect((await validateDeliveryDate([], 'invalid')).valid).toBe(false);
  });
});
