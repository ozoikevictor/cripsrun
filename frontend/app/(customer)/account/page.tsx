'use client';

import { apiUrl } from '@/lib/api';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Shield, LogOut } from 'lucide-react';

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
  const [user, setUser] = useState<AccountUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(apiUrl('/api/users/profile'), {
          credentials: 'include',
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

  const handleLogout = async () => {
    await fetch(apiUrl('/api/auth/session'), { method: 'DELETE', credentials: 'include' });
    router.push('/login');
    router.refresh();
  };

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
      <div className="min-h-screen bg-muted/30">
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
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  id="account-name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone Number</label>
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
              <Button size="sm">Save Changes</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {user.full_name.charAt(0)}
                  </span>
                </div>
                <div>
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
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Saved Addresses
            </h2>
            <Button variant="outline" size="sm">
              Add Address
            </Button>
          </div>

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
                <Button variant="ghost" size="sm">
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
