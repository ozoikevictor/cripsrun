'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Paystack inline payment button.
 * Loads Paystack's inline widget and opens the payment modal.
 *
 * Requires <script src="https://js.paystack.co/v1/inline.js" /> in layout.
 */

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

interface PaystackButtonProps {
  accessCode: string;
  orderId: string;
  totalAmount: number;       // kobo
  isLoading?: boolean;
}

export function PaystackButton({
  accessCode,
  orderId,
  totalAmount,
  isLoading,
}: PaystackButtonProps) {
  const router = useRouter();

  const openPaystack = useCallback(() => {
    if (typeof window === 'undefined' || !window.PaystackPop) {
      console.error('Paystack inline JS not loaded');
      return;
    }

    const paystack = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      access_code: accessCode,
      onClose: () => {
        // User closed modal — order remains PENDING_PAYMENT
        console.log('Payment modal closed');
      },
      callback: (response: { reference: string }) => {
        // Payment completed — redirect to order page
        router.push(
          `/orders/${orderId}?payment=success&ref=${response.reference}`
        );
      },
    });
    paystack.openIframe();
  }, [accessCode, orderId, router]);

  return (
    <Button
      size="lg"
      className="w-full text-base"
      onClick={openPaystack}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          Pay {formatCurrency(totalAmount)}
        </>
      )}
    </Button>
  );
}
