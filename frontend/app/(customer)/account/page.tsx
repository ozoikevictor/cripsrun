'use client';

import { apiUrl } from '@/lib/api';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Shield, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';

interface AccountAddress {
  id: string;
  label: string;
  full_address: string;
  lga: string;
  city: string;
}

interface AccountUser {
  uid: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  addresses: AccountAddress[];
  created_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { logout: handleLogout } = useSession();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<AccountAddress | null>(null);

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !address) return;
    const addresses = user.addresses.some(item => item.id === address.id)
      ? user.addresses.map(item => item.id === address.id ? address : item)
      : [...user.addresses, address];
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/users/profile'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, addresses }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to save address');
      setUser(payload.data);
      setAddress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save address');
    } finally { setSaving(false); }
  }

  async function saveProfile() {
    if (!user || !name.trim() || !phone.trim()) {
      setError('Please enter your name and phone number.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/users/profile'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, full_name: name.trim(), phone: phone.trim() }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to save profile');
      setUser(payload.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(apiUrl('/api/users/profile'), {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error('Unable to load profile');
        }

        const payload = await res.json();
        if (!payload.success) {
          throw new Error(payload.error || 'Unable to load profile');
        }

        setUser(payload.data);
        setName(payload.data.full_name);
        setPhone(payload.data.phone);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="rounded-xl border bg-card p-6">Loading profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="mb-4">{error ?? 'No profile available.'}</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Account</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>

        {/* Profile Card */}
        <div className="rounded-lg border bg-card text-card-foreground p-4 sm:p-6 space-y-4">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </h2>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => { setName(user.full_name); setPhone(user.phone); setError(null); setIsEditing(!isEditing); }}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="account-name" className="text-sm font-medium">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  id="account-name"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="account-phone" className="text-sm font-medium">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  id="account-phone"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input value={user.email} disabled className="opacity-50" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <Button size="sm" disabled={saving} onClick={saveProfile}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {user.full_name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 break-words">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Member since{' '}
                {new Date(user.created_at).toLocaleDateString('en-NG', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Saved Addresses */}
        <div className="rounded-lg border bg-card text-card-foreground p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Saved Addresses
            </h2>
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setAddress({ id: crypto.randomUUID(), label: '', full_address: '', lga: '', city: 'Lagos' })}>
              Add Address
            </Button>
          </div>

          {address && <form onSubmit={saveAddress} className="space-y-3">
            {(['label', 'full_address', 'lga', 'city'] as const).map(field => (
              <div key={field} className="space-y-1">
                <label htmlFor={`address-${field}`} className="text-sm font-medium">{{ label: 'Address name', full_address: 'Street address', lga: 'Local government area', city: 'City' }[field]}</label>
                <Input id={`address-${field}`} required value={address[field]} onChange={event => setAddress({ ...address, [field]: event.target.value })} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save address'}</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setAddress(null)}>Cancel</Button>
            </div>
          </form>}
          {!user.addresses.length && !address && <p className="text-sm text-muted-foreground">No saved addresses.</p>}
          <div className="space-y-3">
            {user.addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{addr.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {addr.full_address}
                  </p>
                  <p className="text-xs text-muted-foreground">{addr.lga}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={saving} onClick={() => setAddress({ ...addr })}>
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
