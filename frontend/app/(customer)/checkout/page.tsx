'use client';

import { apiUrl } from '@/lib/api';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useCartStore } from '@/store/cart.store';
import { useDeliveryDates } from '@/hooks/useDeliveryDates';
import { calcLineTotal, formatCurrency } from '@/lib/utils/format';

const STEPS = ['Address', 'Date', 'Review', 'Payment'];

const DELIVERY_FEE = 200000;   // ₦2,000
const SERVICE_CHARGE = 50000;   // ₦500

function formatDateOnly(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryConfig = useDeliveryDates();

  // Redirect to cart if empty
  if (items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground">Add items before checking out.</p>
        <Link href="/catalog">
          <Button>Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  const VAT_RATE = 7.5;
  const vatAmount = Math.round((subtotal * VAT_RATE) / 100 / 100) * 100;
  const total = subtotal + DELIVERY_FEE + SERVICE_CHARGE + vatAmount;

  const canProceed = () => {
    if (step === 1) return address.trim().length > 5;
    if (step === 2) return deliveryConfig.isDateAvailable(deliveryDate);
    return true;
  };

  const handleCheckout = async () => {
    if (!deliveryConfig.isDateAvailable(deliveryDate)) { setError('Please choose an available delivery date.'); setStep(2); return; }
    setIsSubmitting(true);
    setError(null);

    try {
      const sessionResponse = await fetch(apiUrl('/api/auth/session'), {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!sessionResponse.ok) {
        if (sessionResponse.status !== 401) throw new Error('Unable to verify your account. Please try again.');
        localStorage.removeItem('crisprun-session-present');
        router.replace('/login?from=/checkout');
        return;
      }

      const response = await fetch(apiUrl('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_type: 'SINGLE',
          delivery_date: new Date(deliveryDate).toISOString(),
          delivery_notes: deliveryNotes || null,
          address: {
            full_address: address,
            city: '',
            lga: '',
            instructions: deliveryNotes || null,
          },
          items: items.map((item) => ({
            product_id: item.product_id,
            kg_quantity: item.kg_quantity,
          })),
        }),
        credentials: 'include',
      });

      const payload = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('crisprun-session-present');
        router.replace('/login?from=/checkout');
        return;
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to initialize payment');
      }

      if (!payload.data?.payment_url) {
        throw new Error('Payment initialization failed. No redirect URL received.');
      }

      clearCart();
      window.location.assign(payload.data.payment_url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Checkout failed';
      setError(message);
      console.error('[Checkout] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/cart"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cart
      </Link>

      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Steps indicator */}
      <div className="mb-8">
        <CheckoutSteps currentStep={step} steps={STEPS} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Address */}
          {step === 1 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Enter your full delivery address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  id="delivery-address"
                />
                <p className="text-xs text-muted-foreground">
                  Delivery fee is a flat ₦2,000 and VAT is included in your total.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Delivery Date */}
          {step === 2 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Delivery Date</h2>
              </div>

              {deliveryConfig.loading && <p role="status">Checking delivery availability...</p>}
              {deliveryConfig.scheduleError && <p role="alert" className="text-sm text-red-700">{deliveryConfig.scheduleError}</p>}
              {deliveryDate && !deliveryConfig.loading && !deliveryConfig.scheduleError && !deliveryConfig.isDateAvailable(deliveryDate) && <p role="alert" className="text-sm text-red-700">This date is unavailable or its ordering cutoff has passed. Choose another date.</p>}
              {!deliveryConfig.scheduleError && !deliveryConfig.loading && deliveryConfig.deliveryType === 'MUST_SPLIT' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
                  Your perishable items have incompatible delivery days.
                  Please remove some items or split your order.
                </div>
              )}

              <div className="space-y-3">
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={deliveryConfig.earliestDate.toISOString().split('T')[0]}
                  id="delivery-date"
                />
                {!deliveryConfig.canSelectAnyDay && (
                  <p className="text-xs text-muted-foreground">
                    Some items in your cart are perishable and can only be delivered
                    on specific days of the week.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="delivery-notes" className="text-sm font-medium">
                  Delivery notes (optional)
                </label>
                <Input
                  id="delivery-notes"
                  placeholder="Gate code, landmark, special instructions..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Review Your Order</h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>
                    {formatDateOnly(deliveryDate)}
                  </span>
                </div>
                {deliveryNotes && (
                  <p className="text-muted-foreground italic ml-6">
                    &ldquo;{deliveryNotes}&rdquo;
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-sm">
                    <span>
                      {item.product_snapshot.name} × {item.kg_quantity}kg
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        calcLineTotal(item.product_snapshot.price_per_kg, item.kg_quantity)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Payment</h2>
              </div>

              <p className="text-sm text-muted-foreground">
                You&apos;ll be redirected to Paystack to complete your payment securely.
                We accept cards, bank transfers, and USSD.
              </p>

              <div className="p-4 rounded-xl bg-muted/50 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Total to pay</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(total)}
                </p>
              </div>

              <Button
                size="lg"
                className="w-full text-base"
                onClick={handleCheckout}
                disabled={isSubmitting || deliveryConfig.loading || !!deliveryConfig.scheduleError}
              >
                {isSubmitting ? 'Processing...' : `Place Order`}
              </Button>
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar: Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <OrderSummary
              deliveryFeeKobo={DELIVERY_FEE}
              serviceChargeKobo={SERVICE_CHARGE}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
