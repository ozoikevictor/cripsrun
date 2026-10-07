import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart.store';
import { apiUrl } from '@/lib/api';

interface Schedule { id: string; name: string; product_type: string; days: { day_of_week: number; cutoff_hours: number }[]; }
export function useDeliveryDates() {
  const items = useCartStore(state => state.items);
  const ids = items.map(item => item.product_id).sort().join(',');
  const [result, setResult] = useState<{ ids: string; schedules: Schedule[]; error: string | null } | null>(null);
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    fetch(apiUrl('/api/products/delivery-days?ids=' + encodeURIComponent(ids)), { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Unable to check delivery availability. Please reload to retry.'); return response.json(); })
      .then(payload => { if (!payload.success) throw new Error('Unable to check delivery availability.'); setResult({ ids, schedules: payload.data, error: null }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ ids, schedules: [], error: error.message }); });
    return () => controller.abort();
  }, [ids]);
  const loading = !!ids && result?.ids !== ids;
  const perishable = (result?.ids === ids ? result.schedules : []).filter(item => item.product_type === 'PERISHABLE');
  const missing = perishable.filter(item => !item.days.length);
  const scheduleError = result?.ids === ids ? result.error || (missing.length ? 'Delivery schedule unavailable for ' + missing.map(item => item.name).join(', ') + '. Please remove these items or contact support.' : null) : null;
  const allowedDaysOfWeek = [0, 1, 2, 3, 4, 5, 6].filter(day => perishable.every(item => item.days.some(config => config.day_of_week === day)));
  const earliestDate = new Date();
  earliestDate.setHours(0, 0, 0, 0);
  const isDateAvailable = (value: string) => {
    if (loading || scheduleError || !value) return false;
    const date = new Date(value + 'T00:00:00+01:00');
    if (!Number.isFinite(date.getTime())) return false;
    const day = new Date(value + 'T12:00:00Z').getUTCDay();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (value < today) return false;
    return perishable.every(item => {
      const config = item.days.find(config => config.day_of_week === day);
      return config && Date.now() < date.getTime() - config.cutoff_hours * 3600000;
    });
  };
  return { loading, scheduleError, isDateAvailable, earliestDate, allowedDaysOfWeek, canSelectAnyDay: !perishable.length, deliveryType: allowedDaysOfWeek.length ? 'SINGLE' : 'MUST_SPLIT' };
}
