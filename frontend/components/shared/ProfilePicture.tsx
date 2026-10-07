'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2, UserRound } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function ProfileAvatar({ className = 'h-9 w-9' }: { className?: string }) {
  const { session } = useSession();
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary`}>
    {session?.photo_url && failed !== session.photo_url
      // Small account pictures are already resized before saving.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={session.photo_url} alt="Profile picture" className="h-full w-full object-cover" onError={() => setFailed(session.photo_url!)} />
      : <UserRound className="h-5 w-5" />}
  </span>;
}

export function ProfilePictureEditor() {
  const { session, refresh } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(file: File | null) {
    setBusy(true);
    setMessage('');
    try {
      let photo: string | null = null;
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP picture under 5 MB.');
        const url = URL.createObjectURL(file);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 256;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Unable to prepare picture.');
          const side = Math.min(image.width, image.height);
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, 256, 256);
          context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
          photo = canvas.toDataURL('image/jpeg', 0.8);
        } finally { URL.revokeObjectURL(url); }
      }
      const response = await fetch(apiUrl('/api/users/avatar'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to save picture.');
      await refresh();
      setMessage(file ? 'Picture updated.' : 'Picture removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save picture.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex w-40 flex-col items-center gap-2">
      <button type="button" disabled={busy} aria-label="Change profile picture" aria-busy={busy} onClick={() => input.current?.click()} className="relative h-36 w-36 overflow-hidden rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
        <ProfileAvatar className="h-full w-full" />
        <span className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-center gap-1.5 bg-black/65 text-sm font-semibold text-white">
          <Camera className="h-4 w-4" />{busy ? 'Saving...' : 'Change'}
        </span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile picture" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void save(file); event.target.value = ''; }} />
      {session?.photo_url && <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => void save(null)}><Trash2 className="mr-2 h-4 w-4" />Remove picture</Button>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
