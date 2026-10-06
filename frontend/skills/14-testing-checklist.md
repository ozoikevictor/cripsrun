# Skill 14 — Testing Checklist

> Use this skill when: writing tests, doing a QA pass before launch,
> or verifying a specific feature works end-to-end.

---

## Testing Layers

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Jest + ts-jest | Business logic: pricing calc, date validator, order number generator |
| Integration | Jest + firebase-admin | Firestore helpers, API routes |
| End-to-End | Playwright | Full customer and admin user journeys |
| Manual QA | Browser | Payment flow, SMS/email receipt |

---

## Unit Tests

### `lib/pricing/calculator.test.ts`
```typescript
import { calculateOrderPricing } from '@/lib/pricing/calculator';

describe('calculateOrderPricing', () => {
  const zone = {
    customer_delivery_fee: 300000,   // ₦3,000
    base_logistics_cost: 250000,     // ₦2,500
    service_charge: 75000,           // ₦750
  };

  it('calculates correct totals in kobo', () => {
    const result = calculateOrderPricing({ subtotal: 550000, zone });
    expect(result.delivery_fee).toBe(300000);
    expect(result.logistics_cost).toBe(250000);
    expect(result.delivery_spread).toBe(50000);    // ₦500
    expect(result.service_charge).toBe(75000);
    expect(result.total_amount).toBe(925000);       // 550000 + 300000 + 75000
  });

  it('throws if delivery spread is negative', () => {
    const badZone = { ...zone, base_logistics_cost: 400000 };
    expect(() => calculateOrderPricing({ subtotal: 100000, zone: badZone })).toThrow();
  });

  it('never uses float values', () => {
    const result = calculateOrderPricing({ subtotal: 100000, zone });
    Object.values(result).forEach(val => {
      expect(Number.isInteger(val)).toBe(true);
    });
  });
});
```

### `lib/scheduling/validator.test.ts`
```typescript
import { validateDeliveryDate } from '@/lib/scheduling/validator';

describe('validateDeliveryDate', () => {
  it('rejects dates within 24 hours', async () => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 2);   // Only 2 hours ahead
    const result = await validateDeliveryDate([], tomorrow.toISOString());
    expect(result.valid).toBe(false);
    expect(result.error).toContain('24 hours');
  });

  it('accepts valid future dates for regular items', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const result = await validateDeliveryDate([], nextWeek.toISOString());
    expect(result.valid).toBe(true);
  });
});
```

### `lib/utils/format.test.ts`
```typescript
import { formatCurrency, calcLineTotal } from '@/lib/utils/format';

describe('formatCurrency', () => {
  it('formats kobo to Naira correctly', () => {
    expect(formatCurrency(250000)).toBe('₦2,500');
    expect(formatCurrency(100)).toBe('₦1');
    expect(formatCurrency(0)).toBe('₦0');
  });
});

describe('calcLineTotal', () => {
  it('multiplies kg by price and rounds to integer', () => {
    expect(calcLineTotal(250000, 1.5)).toBe(375000);   // ₦2,500 × 1.5kg = ₦3,750
    expect(calcLineTotal(100000, 0.5)).toBe(50000);
    expect(Number.isInteger(calcLineTotal(100000, 1.3))).toBe(true);
  });
});
```

### `lib/notifications/termii.test.ts`
```typescript
// Test phone number normalization
import { normalizePhone } from '@/lib/notifications/termii';  // export the function

describe('normalizePhone', () => {
  it('handles 11-digit Nigerian numbers', () => {
    expect(normalizePhone('08012345678')).toBe('+2348012345678');
  });
  it('handles already-formatted numbers', () => {
    expect(normalizePhone('+2348012345678')).toBe('+2348012345678');
  });
  it('handles 10-digit without leading zero', () => {
    expect(normalizePhone('8012345678')).toBe('+2348012345678');
  });
  it('handles 234-prefixed without plus', () => {
    expect(normalizePhone('2348012345678')).toBe('+2348012345678');
  });
});
```

---

## Integration Tests

### Order State Machine
```typescript
// tests/integration/order-transitions.test.ts
describe('Order state machine', () => {
  it('allows valid transition: PAYMENT_CONFIRMED → PROCESSING', async () => {
    await expect(
      transitionOrderStatus(testOrderId, 'PROCESSING', 'admin_uid')
    ).resolves.not.toThrow();
  });

  it('blocks invalid transition: DELIVERED → CANCELLED', async () => {
    await expect(
      transitionOrderStatus(deliveredOrderId, 'CANCELLED', 'admin_uid')
    ).rejects.toThrow('Invalid transition');
  });

  it('writes status_history on every transition', async () => {
    await transitionOrderStatus(testOrderId, 'PROCESSING', 'admin_uid', 'Test note');
    const history = await db
      .collection('orders').doc(testOrderId)
      .collection('status_history')
      .orderBy('created_at', 'desc')
      .limit(1).get();
    expect(history.docs[0].data().to_status).toBe('PROCESSING');
    expect(history.docs[0].data().note).toBe('Test note');
  });
});
```

---

## End-to-End Tests (Playwright)

### `tests/e2e/customer-order-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Customer Order Flow', () => {

  test('browse catalog and add items to cart', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();
    await page.locator('[data-testid="add-to-cart"]').first().click();
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');
  });

  test('kg selector respects min_kg', async ({ page }) => {
    await page.goto('/catalog');
    const decreaseBtn = page.locator('[aria-label="Decrease quantity"]').first();
    // The button should be disabled when at min_kg
    await expect(decreaseBtn).toBeDisabled();
  });

  test('perishable items show delivery day restrictions', async ({ page }) => {
    await page.goto('/product/fresh-tilapia');   // Use a perishable product slug
    await expect(page.locator('[data-testid="delivery-days-notice"]')).toBeVisible();
  });

  test('checkout blocks delivery on wrong day for perishable items', async ({ page }) => {
    // ... add perishable item to cart, try to select a non-allowed delivery day
    // The calendar day should be visually disabled
  });

  test('order total breakdown shows service charge separately', async ({ page }) => {
    // At checkout, confirm:
    // - Subtotal shown
    // - Delivery fee shown
    // - Service charge shown (₦500–₦1,000)
    // - Total = subtotal + delivery fee + service charge
    // logistics_cost MUST NOT appear anywhere on the page
    const pageContent = await page.content();
    expect(pageContent).not.toContain('logistics_cost');
    expect(pageContent).not.toContain('delivery_spread');
  });

});
```

### `tests/e2e/admin-flow.spec.ts`
```typescript
test.describe('Admin Panel', () => {

  test('admin can access dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('non-admin cannot access admin routes', async ({ page }) => {
    // Log in as customer first
    // Then try to navigate to admin
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);  // Should redirect
  });

  test('revenue report shows ring-fenced column', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.locator('[data-testid="ring-fenced-column"]')).toBeVisible();
  });

  test('dispatch button only appears for PAYMENT_CONFIRMED orders', async ({ page }) => {
    // An order in PENDING_PAYMENT status should NOT show a Dispatch button
  });

});
```

---

## Manual QA Checklist (Run Before Launch)

### Auth
- [ ] Register with a valid Nigerian phone number
- [ ] Phone stored in E.164 format in Firestore (`+2348...`)
- [ ] Login redirects to `/catalog`
- [ ] Non-admin trying to access `/admin/dashboard` is redirected to `/login`
- [ ] Admin login gives access to admin panel

### Catalog
- [ ] All active products visible
- [ ] Inactive products NOT visible (verify `is_active: false` hides them)
- [ ] Perishable products show delivery day badge
- [ ] `min_kg` enforced — decrease button disabled at minimum
- [ ] Price updates correctly as kg increases: `kg × price_per_kg`

### Checkout
- [ ] Address autocomplete suggests Nigerian addresses
- [ ] Zone detection fires after address selection
- [ ] Delivery fee and service charge appear in order summary
- [ ] `logistics_cost` and `delivery_spread` are NOT visible anywhere on checkout pages
- [ ] Perishable date picker: wrong days are greyed out / unclickable
- [ ] Mixed cart (regular + perishable): user is offered SINGLE or SPLIT choice
- [ ] Minimum kg validation fires server-side if bypassed on client

### Payment
- [ ] Paystack modal opens after clicking pay
- [ ] Test payment (use Paystack test card: 4084080408040409) goes through
- [ ] Order status changes to PAYMENT_CONFIRMED after successful payment
- [ ] Revenue record is written to Firestore immediately
- [ ] SMS received on registered phone number
- [ ] Email received on registered email

### Admin
- [ ] New order appears in admin orders list
- [ ] Dispatch button visible for PAYMENT_CONFIRMED orders
- [ ] Status update flows through all stages correctly
- [ ] Revenue report shows correct amounts
- [ ] Ring-fenced amount equals sum of service charges exactly
- [ ] Low stock alert appears when stock_kg ≤ low_stock_threshold
- [ ] Pricing config update takes effect on next order

### Security (Manual)
- [ ] Try visiting `/api/admin/products` without admin session → should get 403
- [ ] Try visiting `/api/zones/detect` → confirm `logistics_cost` is absent from response
- [ ] Open browser dev tools on checkout page → confirm no `logistics_cost` or `sk_` keys in network responses
- [ ] Try to create a product via API with `role: admin` in the body → role must be ignored

---

## Paystack Test Cards

Use these during development:

| Card | Result |
|---|---|
| 4084 0804 0840 0409 | Successful payment |
| 4084 0840 8404 0894 | Successful payment (3D Secure) |
| 5531 8866 5214 2950 | Successful payment (Mastercard) |
| 4084 0808 4084 0845 | Declined payment |

**Test secret key prefix:** `sk_test_`
**Test public key prefix:** `pk_test_`

Switch to live keys (`sk_live_`, `pk_live_`) only for production deployment.
Paystack test mode does NOT charge real cards.

---

## Performance Benchmarks (Target)

| Page | Target Load Time | Measured |
|---|---|---|
| `/catalog` (20 products) | < 1.5s | - |
| `/product/[slug]` | < 1.0s | - |
| `/checkout` | < 1.5s | - |
| `/admin/dashboard` | < 2.0s | - |
| `/orders` (customer) | < 1.5s | - |

Use Next.js built-in analytics + Vercel Speed Insights to measure.
