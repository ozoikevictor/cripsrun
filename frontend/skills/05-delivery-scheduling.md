# Skill 05 — Delivery Scheduling

> Use this skill when: implementing the delivery date picker, validating cutoff times,
> or handling perishable item scheduling constraints.

---

## Core Logic

### The Scheduling Rules
1. **Regular items**: Any calendar day, minimum 24h from now.
2. **Perishable items**: Only days listed in their `delivery_days` sub-collection.
3. **Cutoff enforcement**: For each perishable item, the order must be placed before `cutoff_hours` hours ahead of midnight of the delivery day.
   - Example: `cutoff_hours = 12`, delivery day = Thursday → cutoff = Wednesday 12:00 PM.
4. **Mixed carts**: Available dates = intersection of allowed days across ALL perishable items.
5. **Incompatible perishables**: If intersection is empty, the order MUST be split.

---

## Server-Side Validator (API-Level — enforced on every order)

### `lib/scheduling/validator.ts`
```typescript
import { db } from '@/lib/firebase/admin';

interface ItemToValidate {
  product_id: string;
  kg_quantity: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the requested delivery_date is permitted for all items in the order.
 * This runs SERVER-SIDE on every checkout request — NEVER rely only on client-side checks.
 */
export async function validateDeliveryDate(
  items: ItemToValidate[],
  deliveryDateISO: string
): Promise<ValidationResult> {
  const deliveryDate = new Date(deliveryDateISO);
  const deliveryDayOfWeek = deliveryDate.getDay(); // 0=Sun, 6=Sat
  const now = new Date();

  // ── Minimum 24h lead time ─────────────────────────────────────────────────
  const minDeliveryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (deliveryDate < minDeliveryDate) {
    return {
      valid: false,
      error: 'Delivery must be scheduled at least 24 hours in advance.',
    };
  }

  // ── Validate delivery date for each PERISHABLE product ───────────────────
  for (const item of items) {
    const productSnap = await db.collection('products').doc(item.product_id).get();
    if (!productSnap.exists) {
      return { valid: false, error: `Product ${item.product_id} not found.` };
    }

    const product = productSnap.data()!;

    if (product.product_type !== 'PERISHABLE') continue;

    // Fetch allowed delivery days
    const daysSnap = await db
      .collection('products')
      .doc(item.product_id)
      .collection('delivery_days')
      .get();

    if (daysSnap.empty) {
      return {
        valid: false,
        error: `Perishable product "${product.name}" has no delivery days configured. Contact support.`,
      };
    }

    const deliveryDayDocs = daysSnap.docs.map(d => d.data());
    const allowedDays = deliveryDayDocs.map(d => d.day_of_week as number);

    // Check if selected delivery day is in allowed days
    if (!allowedDays.includes(deliveryDayOfWeek)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const allowedNames = allowedDays.map(d => dayNames[d]).join(', ');
      return {
        valid: false,
        error: `"${product.name}" can only be delivered on: ${allowedNames}. You selected ${dayNames[deliveryDayOfWeek]}.`,
      };
    }

    // Check cutoff time for this specific delivery day
    const dayConfig = deliveryDayDocs.find(d => d.day_of_week === deliveryDayOfWeek)!;
    const cutoffHours = dayConfig.cutoff_hours as number;

    // Cutoff = midnight of delivery day minus cutoff_hours
    const deliveryMidnight = new Date(deliveryDate);
    deliveryMidnight.setHours(0, 0, 0, 0);
    const cutoffTime = new Date(deliveryMidnight.getTime() - cutoffHours * 60 * 60 * 1000);

    if (now >= cutoffTime) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        valid: false,
        error: `Orders for "${product.name}" on ${dayNames[deliveryDayOfWeek]} must be placed before ${formatCutoffTime(cutoffTime)}.`,
      };
    }
  }

  return { valid: true };
}

function formatCutoffTime(date: Date): string {
  return date.toLocaleString('en-NG', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
```

---

## Client-Side Date Picker Component

### `components/checkout/DeliveryDatePicker.tsx`
```typescript
'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CalendarDays, Scissors } from 'lucide-react';
import { useDeliveryDates } from '@/hooks/useDeliveryDates';
import { isBefore, addDays, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';

interface DeliveryDatePickerProps {
  onSelect: (config: { deliveryType: 'SINGLE' | 'SPLIT'; regularDate?: Date; perishableDate?: Date }) => void;
}

export function DeliveryDatePicker({ onSelect }: DeliveryDatePickerProps) {
  const config = useDeliveryDates();
  const [mode, setMode] = useState<'single' | 'split'>('single');
  const [singleDate, setSingleDate] = useState<Date>();
  const [regularDate, setRegularDate] = useState<Date>();
  const [perishableDate, setPerishableDate] = useState<Date>();

  const today = startOfDay(new Date());
  const minDate = addDays(today, 1);

  /** Determine if a date should be disabled in the picker */
  const isDateDisabled = (date: Date, allowedDays: number[]): boolean => {
    if (isBefore(date, minDate)) return true;
    if (config.canSelectAnyDay) return false;
    return !allowedDays.includes(date.getDay());
  };

  // ── Incompatible perishables: force split ─────────────────────────────────
  if (config.deliveryType === 'MUST_SPLIT') {
    return (
      <div className="space-y-4">
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your cart contains perishable items with incompatible delivery days.
            They must be delivered separately.
          </AlertDescription>
        </Alert>
        <SplitDeliveryPicker
          onRegularSelect={setRegularDate}
          onPerishableSelect={setPerishableDate}
          minDate={minDate}
          perishableAllowedDays={[]}
          onConfirm={() => onSelect({ deliveryType: 'SPLIT', regularDate, perishableDate })}
        />
      </div>
    );
  }

  // ── Regular items only: any date ──────────────────────────────────────────
  if (!config.canSelectAnyDay && config.allowedDaysOfWeek.length === 0) {
    return <div>No delivery days configured. Please contact support.</div>;
  }

  // ── Mixed cart: offer choice ───────────────────────────────────────────────
  if (config.deliveryType === 'CAN_SPLIT' && mode === 'single') {
    return (
      <div className="space-y-4">
        <Alert>
          <CalendarDays className="h-4 w-4" />
          <AlertDescription>
            Your cart has regular and perishable items. Choose your delivery preference:
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => setMode('single')}>
            <CalendarDays className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Single Delivery</span>
            <span className="text-xs text-muted-foreground">Everything on one day</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => setMode('split')}>
            <Scissors className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Split Delivery</span>
            <span className="text-xs text-muted-foreground">Different days per type</span>
          </Button>
        </div>

        {mode === 'single' && (
          <>
            <p className="text-sm text-muted-foreground">
              Select a delivery day available for all perishable items:
            </p>
            <Calendar
              mode="single"
              selected={singleDate}
              onSelect={setSingleDate}
              disabled={(date) => isDateDisabled(date, config.allowedDaysOfWeek)}
              className="rounded-md border"
            />
            {singleDate && (
              <Button
                className="w-full"
                onClick={() => onSelect({ deliveryType: 'SINGLE', perishableDate: singleDate, regularDate: singleDate })}
              >
                Confirm Delivery: {singleDate.toLocaleDateString('en-NG', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Default: single date picker ───────────────────────────────────────────
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {config.canSelectAnyDay
          ? 'Select your preferred delivery date:'
          : `Delivery available on: ${config.allowedDaysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`
        }
      </p>
      <Calendar
        mode="single"
        selected={singleDate}
        onSelect={setSingleDate}
        disabled={(date) => isDateDisabled(date, config.allowedDaysOfWeek)}
        className="rounded-md border"
      />
      {singleDate && (
        <Button
          className="w-full"
          onClick={() => onSelect({ deliveryType: 'SINGLE', perishableDate: singleDate, regularDate: singleDate })}
        >
          Confirm Delivery: {singleDate.toLocaleDateString('en-NG', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Button>
      )}
    </div>
  );
}

// Sub-component for split delivery
function SplitDeliveryPicker({
  onRegularSelect,
  onPerishableSelect,
  minDate,
  perishableAllowedDays,
  onConfirm,
}: {
  onRegularSelect: (d: Date) => void;
  onPerishableSelect: (d: Date) => void;
  minDate: Date;
  perishableAllowedDays: number[];
  onConfirm: () => void;
}) {
  const [regularDate, setRegularDate] = useState<Date>();
  const [perishableDate, setPerishableDate] = useState<Date>();

  const canConfirm = !!regularDate && !!perishableDate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium mb-2">Regular Items Delivery:</p>
        <Calendar
          mode="single"
          selected={regularDate}
          onSelect={(d) => { setRegularDate(d); if(d) onRegularSelect(d); }}
          disabled={(date) => isBefore(date, minDate)}
          className="rounded-md border"
        />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Perishable Items Delivery:</p>
        <Calendar
          mode="single"
          selected={perishableDate}
          onSelect={(d) => { setPerishableDate(d); if(d) onPerishableSelect(d); }}
          disabled={(date) => isBefore(date, minDate) || !perishableAllowedDays.includes(date.getDay())}
          className="rounded-md border"
        />
      </div>
      <div className="md:col-span-2">
        <Button className="w-full" disabled={!canConfirm} onClick={onConfirm}>
          Confirm Split Delivery
        </Button>
        {canConfirm && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            ⚠️ Two separate delivery fees apply for split orders.
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## Admin: Delivery Day Config UI

Key requirements for the admin delivery day setup form:

```typescript
// Day checkbox component reference
const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

// For each selected day, the admin must set:
// - cutoff_hours: how many hours before midnight of that delivery day orders close
// - Show a human-readable preview: "Orders must be placed by [day] at [time]"

// Example preview calculation:
function getCutoffPreview(deliveryDay: number, cutoffHours: number): string {
  const now = new Date();
  // Find next occurrence of this delivery day
  const daysUntil = (deliveryDay - now.getDay() + 7) % 7 || 7;
  const nextDelivery = new Date();
  nextDelivery.setDate(now.getDate() + daysUntil);
  nextDelivery.setHours(0, 0, 0, 0);

  const cutoff = new Date(nextDelivery.getTime() - cutoffHours * 3600000);
  return `Orders close ${cutoff.toLocaleDateString('en-NG', {
    weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true
  })}`;
}
```
