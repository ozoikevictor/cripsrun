'use client';
import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DeliveryDaysEditor({ productId }: { productId: string }) {
  const [days, setDays] = useState<number[]>([]);
  const [cutoff, setCutoff] = useState(24);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setBusy(true);
    fetch(apiUrl(`/api/products/delivery-days?ids=${encodeURIComponent(productId)}`), { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(payload => { if (!active) return; const saved = payload.data[0].days; setDays(saved.map((day: { day_of_week: number }) => day.day_of_week)); setCutoff(saved[0]?.cutoff_hours || 24); setMessage(saved.length ? '' : 'Select the delivery days for this product.'); })
      .catch(() => { if (active) setMessage('Unable to load schedule. Reopen the product to retry.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [productId]);
  async function save() {
    setBusy(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/products/${productId}/delivery-days`), { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery_days: days.map(day => ({ day_of_week: day, cutoff_hours: cutoff })) }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to save schedule');
      setMessage('Delivery schedule saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save schedule'); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy} className="space-y-3 border-t pt-4">
    <legend className="text-sm font-semibold">Delivery schedule</legend>
    <div className="flex flex-wrap gap-3">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label, day) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={days.includes(day)} onChange={event => setDays(current => event.target.checked ? [...current, day] : current.filter(value => value !== day))} />{label}</label>)}</div>
    <label className="block text-sm">Cutoff hours before delivery midnight<Input type="number" min={1} max={72} value={cutoff} onChange={event => setCutoff(Number(event.target.value))} /></label>
    <Button type="button" disabled={busy || !days.length || cutoff < 1 || cutoff > 72} onClick={save}>{busy ? 'Loading...' : 'Save schedule'}</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </fieldset>;
}
