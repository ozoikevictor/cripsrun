# Payment Security: Stage One

This stage secures the existing single-seller payment flow. It does not implement
escrow, fulfillment uploads, customer confirmation, reviews, disputes, refunds,
or seller payouts. Payment received does not mean payment is legally held in escrow.

## Changes

- Both webhook and customer verification call the same Firestore transaction.
- The provider must verify success, reference, amount, NGN currency, order metadata,
  and a valid payment timestamp before the transaction writes anything.
- Customers may verify only their own orders; admins retain authorized access.
- Orders, payment records, history, and revenue are committed atomically.
- Successful repeated requests do not rewind an order that is already processing.
- Payments use their provider reference as the document ID, preventing reuse.
- Webhooks check the exact raw-body HMAC with a timing-safe comparison.
- Processing failures return 503 so Paystack can retry.
- No failed event can downgrade an already verified successful payment.
- Checkout stores its generated reference before initializing the provider payment.
- Legacy POST /api/orders is disabled. Use POST /api/checkout, which reads prices
  from the product database instead of accepting client totals.
- Firestore timestamp sentinels are preserved during order creation.

## Database

No bulk migration or historical-order updates are performed.
New verified payments create payments/{reference}, containing order ID, customer
ID, amount in kobo, currency, reference, status, and verification timestamps.
Existing orders gain currency when newly created or verified.
The existing status_history and revenue_records collections remain in use.
Payment history uses the deterministic payment-confirmed document ID.

## Configuration

Existing Firebase Admin credentials, PAYSTACK_SECRET_KEY, NEXT_PUBLIC_APP_URL,
and frontend BACKEND_URL remain required. No new secret or payout setting is added.
Use Paystack test credentials and an isolated Firebase test project for tests.
Configure Paystack's webhook URL to the backend /api/payments/webhook endpoint.
Never point local destructive tests at the live Firebase project.

## Local Verification

1. Start backend and frontend using the existing project setup.
2. Sign in, place a checkout order, and complete a Paystack test payment.
3. Verify the order changes from PENDING_PAYMENT to PAYMENT_CONFIRMED.
4. Check that exactly one matching payment, payment-confirmed history entry,
   and revenue record exists.
5. Call GET /api/payments/verify/{reference} repeatedly as the customer. The
   record count must not change; a PROCESSING order must not be reset.
6. Sign in as a different customer and verify that reference: expect 403.
7. A webhook with no signature or an incorrect signature must return 400.
8. Run the backend Jest suite from frontend with
   npx jest --config jest.backend.config.js --runInBand.

Automated tests use mocks and do not charge accounts or contact Paystack.
Provider sandbox verification and concurrent Firestore emulator tests are still
required before production; unit tests alone do not certify financial safety.
