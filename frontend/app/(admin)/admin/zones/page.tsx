'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { Plus, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const LAGOS_LGAS = [
  'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
  'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
  'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
  'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere',
];

interface DeliveryZone {
  id: string;
  name: string;
  lgas: string[];
  areas?: string[];
  customer_delivery_fee: number;
  base_logistics_cost: number;
  delivery_spread: number;
  service_charge: number;
  estimated_delivery_minutes: number;
  is_active: boolean;
}

export default function AdminZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedLgas, setSelectedLgas] = useState<string[]>([]);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [logisticsCost, setLogisticsCost] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [deliveryMinutes, setDeliveryMinutes] = useState('');
  const [lgaDropdownOpen, setLgaDropdownOpen] = useState(false);

  const loadZones = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/admin/zones'), { credentials: 'include', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load delivery zones');
      setZones(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load delivery zones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const createZone = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/admin/zones'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          lgas: selectedLgas,
          areas: [],
          base_logistics_cost: costKobo,
          customer_delivery_fee: feeKobo,
          service_charge: Math.round(Number(serviceCharge) * 100),
          estimated_delivery_minutes: Number(deliveryMinutes),
          is_active: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to create zone');
      setName('');
      setSelectedLgas([]);
      setDeliveryFee('');
      setLogisticsCost('');
      setServiceCharge('');
      setDeliveryMinutes('');
      setShowCreate(false);
      await loadZones();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create zone');
    } finally {
      setIsSaving(false);
    }
  };

  // Live spread calculation (in kobo)
  const feeKobo = Math.round(parseFloat(deliveryFee || '0') * 100);
  const costKobo = Math.round(parseFloat(logisticsCost || '0') * 100);
  const spreadKobo = feeKobo - costKobo;
  const isSpreadPositive = spreadKobo > 0;

  const toggleLga = (lga: string) => {
    setSelectedLgas((prev) =>
      prev.includes(lga) ? prev.filter((l) => l !== lga) : [...prev, lga]
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delivery Zones</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Zone
        </Button>
      </div>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Create Delivery Zone</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Zone Name</label>
              <Input
                placeholder="e.g. Lekki Phase 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Lagos LGAs</label>
              <button
                onClick={() => setLgaDropdownOpen(!lgaDropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <span className="text-muted-foreground">
                  {selectedLgas.length > 0
                    ? `${selectedLgas.length} selected`
                    : 'Select LGAs...'}
                </span>
                {lgaDropdownOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {lgaDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {LAGOS_LGAS.map((lga) => (
                    <button
                      key={lga}
                      onClick={() => toggleLga(lga)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        selectedLgas.includes(lga)
                          ? 'bg-primary/10 text-primary font-medium'
                          : ''
                      }`}
                    >
                      {selectedLgas.includes(lga) ? '✓ ' : ''}{lga}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Delivery Fee (₦)</label>
              <Input
                type="number"
                placeholder="2000"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Logistics Cost (₦) — Internal</label>
              <Input
                type="number"
                placeholder="1500"
                value={logisticsCost}
                onChange={(e) => setLogisticsCost(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Service Charge (₦)</label>
              <Input
                type="number"
                placeholder="500"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">₦500–₦2,000 range — ring-fenced for fleet fund</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Est. Delivery Time (minutes)</label>
              <Input
                type="number"
                placeholder="45"
                value={deliveryMinutes}
                onChange={(e) => setDeliveryMinutes(e.target.value)}
              />
            </div>
          </div>

          {/* Live spread preview */}
          {(deliveryFee || logisticsCost) && (
            <div
              className={`p-3 rounded-lg text-sm ${
                isSpreadPositive
                  ? 'bg-crisp-50 text-crisp-800 dark:bg-crisp-950 dark:text-crisp-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
              }`}
            >
              Customer sees: <strong>{formatCurrency(feeKobo)}</strong> •
              You pay courier: <strong>{formatCurrency(costKobo)}</strong> •
              Spread: <strong>{formatCurrency(spreadKobo)}</strong>
              {!isSpreadPositive && ' ⚠ Spread must be positive!'}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={createZone} disabled={!name.trim() || selectedLgas.length === 0 || !isSpreadPositive || Number(serviceCharge) < 500 || Number(serviceCharge) > 2000 || Number(deliveryMinutes) < 10 || Number(deliveryMinutes) > 480 || isSaving}>
              {isSaving ? 'Creating...' : 'Create Zone'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Zone list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Loading zones...</p>
        ) : zones.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No delivery zones in the database yet.</p>
        ) : zones.map((zone) => (
          <div
            key={zone.id}
            className={`rounded-xl border bg-card p-5 space-y-3 transition-shadow hover:shadow-sm ${
              !zone.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{zone.name}</h3>
              </div>
              <Badge variant={zone.is_active ? 'success' : 'secondary'}>
                {zone.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1">
              {zone.lgas.map((lga) => (
                <Badge key={lga} variant="outline" className="text-xs">
                  {lga}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Customer fee</p>
                <p className="font-medium">{formatCurrency(zone.customer_delivery_fee)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Logistics cost</p>
                <p className="font-medium text-amber-600">{formatCurrency(zone.base_logistics_cost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spread</p>
                <p className="font-medium text-crisp-600">{formatCurrency(zone.delivery_spread)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Service charge</p>
                <p className="font-medium">{formatCurrency(zone.service_charge)}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Est. {zone.estimated_delivery_minutes} min delivery
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
