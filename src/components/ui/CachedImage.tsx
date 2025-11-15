import React, { useState, useEffect } from 'react';
import { imageCache } from '../../lib/storage';

interface CachedImageProps {
  cacheId: string;
  fallbackUrl?: string | null;
  alt: string;
  className?: string;
}

export function CachedImage({ cacheId, fallbackUrl, alt, className }: CachedImageProps) {
  const [src, setSrc] = useState<string | null>(fallbackUrl || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        const cached = await imageCache.get(cacheId);
        if (mounted && cached) {
          setSrc(cached);
        } else if (mounted && fallbackUrl) {
          setSrc(fallbackUrl);
        }
      } catch {
        if (mounted && fallbackUrl) {
          setSrc(fallbackUrl);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [cacheId, fallbackUrl]);

  if (!src) {
    return null;
  }

  return <img src={src} alt={alt} className={className} />;
}
