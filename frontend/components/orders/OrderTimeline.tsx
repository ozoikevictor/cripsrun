'use client';

import { CheckCircle, Circle, XCircle, Loader2 } from 'lucide-react';
import type { OrderStatus } from '@/types/order.types';

const TIMELINE_STEPS: Array<{
  status: OrderStatus;
  label: string;
  description: string;
}> = [
  { status: 'PENDING_PAYMENT', label: 'Order Placed', description: 'Waiting for payment' },
  { status: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Your payment was received' },
  { status: 'PROCESSING', label: 'Processing', description: 'Preparing your order' },
  { status: 'AWAITING_PICKUP', label: 'Order Ready', description: 'Waiting for rider pickup' },
  { status: 'IN_TRANSIT', label: 'On the Way', description: 'Your order is being delivered' },
  { status: 'DELIVERED', label: 'Delivered', description: 'Your order has arrived' },
];

const STATUS_ORDER: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'AWAITING_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
];

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  statusHistory?: Array<{
    to_status: OrderStatus;
    created_at: string | null;
    note: string | null;
  }>;
}

export function OrderTimeline({ currentStatus, statusHistory = [] }: OrderTimelineProps) {
  const isFailed = currentStatus === 'CANCELLED' || currentStatus === 'FAILED_DELIVERY';
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, index) => {
        const stepIndex = STATUS_ORDER.indexOf(step.status);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step.status === currentStatus;
        const historyEntry = statusHistory.find((h) => h.to_status === step.status);

        return (
          <div key={step.status} className="flex gap-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className={`mt-1 flex-shrink-0 ${
                  isCompleted
                    ? 'text-crisp-500'
                    : isCurrent && !isFailed
                    ? 'text-primary'
                    : 'text-muted-foreground/40'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : isCurrent && !isFailed ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`w-px flex-1 my-1 ${
                    isCompleted ? 'bg-crisp-300' : 'bg-border'
                  }`}
                />
              )}
            </div>

            {/* Label + timestamp */}
            <div className="pb-5">
              <p
                className={`text-sm font-medium ${
                  !isCompleted && !isCurrent ? 'text-muted-foreground/60' : ''
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
              {historyEntry?.created_at && !Number.isNaN(new Date(historyEntry.created_at).getTime()) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(historyEntry.created_at).toLocaleString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {isFailed && (
        <div className="flex items-center gap-2 text-destructive mt-2">
          <XCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            {currentStatus === 'CANCELLED' ? 'Order Cancelled' : 'Delivery Failed'}
          </span>
        </div>
      )}
    </div>
  );
}
