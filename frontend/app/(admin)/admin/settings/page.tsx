'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Store,
  Truck,
  Bell,
  Shield,
  Save,
  CheckCircle,
} from 'lucide-react';
import { apiUrl } from '@/lib/api';

const DEFAULT_CONFIG = {
  store: {
    name: 'CrispRun',
    address: '',
    phone: '',
    email: '',
    lat: 0,
    lng: 0,
  },
  logistics: {
    active_providers: ['gokada', 'uber_direct'] as string[],
    default_provider: 'gokada',
    fallback_enabled: true,
    phase: 1,
  },
  notifications: {
    sms_enabled: true,
    email_enabled: true,
    sender_id: 'CrispRun',
  },
  pricing: {
    default_service_charge: 50000, // ₦500 in kobo
    min_order_value: 300000,       // ₦3,000 in kobo
  },
};

const PROVIDER_OPTIONS = [
  { id: 'gokada', name: 'Gokada', status: 'active' },
  { id: 'uber_direct', name: 'Uber Direct', status: 'active' },
  { id: 'bolt_food', name: 'Bolt Food', status: 'stub' },
  { id: 'glovo', name: 'Glovo', status: 'stub' },
  { id: 'own_fleet', name: 'Own Fleet (Phase 2)', status: 'locked' },
];

export default function AdminSettingsPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/api/admin/settings'), { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load settings');
        if (active) setConfig(payload.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load settings');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(apiUrl('/api/admin/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to save settings');
      setConfig(payload.data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const formatKobo = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform configuration — changes apply immediately
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2" disabled={isLoading || isSaving}>
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading saved settings...</p>}

      {/* Store Info */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Store className="h-4 w-4" />
          Store Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Store Name</Label>
            <Input
              value={config.store.name}
              onChange={(e) =>
                setConfig({ ...config, store: { ...config.store, name: e.target.value } })
              }
              id="settings-store-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={config.store.phone}
              onChange={(e) =>
                setConfig({ ...config, store: { ...config.store, phone: e.target.value } })
              }
              id="settings-store-phone"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Pickup Address</Label>
            <Input
              value={config.store.address}
              onChange={(e) =>
                setConfig({ ...config, store: { ...config.store, address: e.target.value } })
              }
              id="settings-store-address"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={config.store.email}
              onChange={(e) =>
                setConfig({ ...config, store: { ...config.store, email: e.target.value } })
              }
              id="settings-store-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-store-lat">Pickup latitude</Label>
            <Input
              id="settings-store-lat"
              type="number"
              step="any"
              value={config.store.lat}
              onChange={(e) =>
                setConfig({ ...config, store: { ...config.store, lat: Number(e.target.value) } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-store-lng">Pickup longitude</Label>
            <Input
              id="settings-store-lng"
              type="number"
              step="any"
              value={config.store.lng}
              onChange={(e) =>
                setConfig({ ...config, store: { ...config.store, lng: Number(e.target.value) } })
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Logistics */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Logistics Providers
          <Badge variant="secondary">Phase {config.logistics.phase}</Badge>
        </h2>
        <p className="text-sm text-muted-foreground">
          Providers are tried in order. Enable failover to automatically try the next provider if dispatch fails.
        </p>

        <div className="max-w-sm space-y-2">
          <Label htmlFor="settings-default-provider">Default provider</Label>
          <select
            id="settings-default-provider"
            value={config.logistics.default_provider}
            onChange={(e) =>
              setConfig({
                ...config,
                logistics: {
                  ...config.logistics,
                  default_provider: e.target.value,
                  active_providers: config.logistics.active_providers.includes(e.target.value)
                    ? config.logistics.active_providers
                    : [...config.logistics.active_providers, e.target.value],
                },
              })
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {PROVIDER_OPTIONS.filter((provider) => provider.status !== 'locked').map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {PROVIDER_OPTIONS.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{p.name}</span>
                <Badge
                  variant={
                    p.status === 'active'
                      ? 'default'
                      : p.status === 'stub'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs"
                >
                  {p.status === 'active'
                    ? 'Ready'
                    : p.status === 'stub'
                      ? 'Needs API Key'
                      : 'Phase 2'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {config.logistics.default_provider === p.id && (
                  <Badge variant="default" className="text-xs">
                    Default
                  </Badge>
                )}
                <input
                  type="checkbox"
                  checked={config.logistics.active_providers.includes(p.id)}
                  onChange={(e) => {
                    const active = e.target.checked
                      ? [...config.logistics.active_providers, p.id]
                      : config.logistics.active_providers.filter((x) => x !== p.id);
                    if (active.length === 0) return;
                    setConfig({
                      ...config,
                      logistics: {
                        ...config.logistics,
                        active_providers: active,
                        default_provider: active.includes(config.logistics.default_provider)
                          ? config.logistics.default_provider
                          : active[0],
                      },
                    });
                  }}
                  disabled={p.status === 'locked' || (config.logistics.active_providers.length === 1 && config.logistics.active_providers.includes(p.id))}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            checked={config.logistics.fallback_enabled}
            onChange={(e) =>
              setConfig({
                ...config,
                logistics: { ...config.logistics, fallback_enabled: e.target.checked },
              })
            }
            className="h-4 w-4 rounded border-gray-300"
            id="settings-failover"
          />
          <Label htmlFor="settings-failover" className="text-sm">
            Enable automatic failover (try next provider on dispatch failure)
          </Label>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">SMS Notifications (Termii)</p>
              <p className="text-xs text-muted-foreground">
                Send order updates via SMS to customer phone
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.notifications.sms_enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  notifications: { ...config.notifications, sms_enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Email Notifications (Resend)</p>
              <p className="text-xs text-muted-foreground">
                Send branded HTML order emails to customer
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.notifications.email_enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  notifications: { ...config.notifications, email_enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
          <div className="space-y-2">
            <Label>SMS Sender ID</Label>
            <Input
              value={config.notifications.sender_id}
              onChange={(e) =>
                setConfig({
                  ...config,
                  notifications: { ...config.notifications, sender_id: e.target.value },
                })
              }
              maxLength={11}
              id="settings-sender-id"
            />
            <p className="text-xs text-muted-foreground">Max 11 characters (Termii requirement)</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Pricing */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Pricing Defaults
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Service Charge</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={config.pricing.default_service_charge / 100}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricing: {
                      ...config.pricing,
                      default_service_charge: Math.round(Number(e.target.value) * 100),
                    },
                  })
                }
                id="settings-service-charge"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                = {formatKobo(config.pricing.default_service_charge)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ring-fenced for Phase 2 fleet fund
            </p>
          </div>
          <div className="space-y-2">
            <Label>Minimum Order Value</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={config.pricing.min_order_value / 100}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricing: {
                      ...config.pricing,
                      min_order_value: Math.round(Number(e.target.value) * 100),
                    },
                  })
                }
                id="settings-min-order"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                = {formatKobo(config.pricing.min_order_value)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
