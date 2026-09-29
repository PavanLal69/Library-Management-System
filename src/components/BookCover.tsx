'use client';

import React, { useState, useEffect } from 'react';
import { getBookCoverUrl, generateSvgCoverDataUri } from '@/lib/book-covers';

interface BookCoverProps {
  title: string;
  coverImageUrl?: string | null;
  isbn?: string | null;
  authorName?: string;
  categoryName?: string;
  className?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
}

export function BookCover({
  title,
  coverImageUrl,
  isbn,
  authorName,
  categoryName,
  className = 'w-full h-full object-cover',
  alt,
  loading = 'lazy',
}: BookCoverProps) {
  const [src, setSrc] = useState<string>(() =>
    getBookCoverUrl({ isbn, title, coverImageUrl })
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    setSrc(getBookCoverUrl({ isbn, title, coverImageUrl }));
  }, [coverImageUrl, isbn, title]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Fallback directly to bespoke SVG publisher cover
      const svgFallback = generateSvgCoverDataUri(
        title,
        authorName || 'Faculty Author',
        categoryName || 'Computer Science'
      );
      setSrc(svgFallback);
    }
  };

  return (
    <img
      src={src}
      alt={alt || title}
      loading={loading}
      onError={handleError}
      className={className}
    />
  );
}
