'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { Leaf } from 'lucide-react';

export function ProductImage({ src, alt, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps['src'] | null>(null);
  if (failedSource === src) {
    return <div role="img" aria-label={`${alt}: image unavailable`} className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"><Leaf className="h-8 w-8" /></div>;
  }
  const remote = typeof src === 'string' && /^https?:\/\//.test(src);
  const supported = !remote || /^https:\/\/(firebasestorage.googleapis.com|res.cloudinary.com)\//.test(String(src));
  return <Image {...props} src={src} alt={alt} unoptimized={!supported} onError={() => setFailedSource(src)} />;
}
