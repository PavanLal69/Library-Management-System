'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  BookOpen,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Share2,
  Building,
  ArrowLeftRight,
} from 'lucide-react';
import { BookCardResult } from '@/server/services/BookService';
import { useAuth } from '@/features/auth/AuthContext';
import { BookCover } from '@/components/BookCover';
import { useCompare } from '@/features/compare/CompareContext';
import { notifyBookHovered, notifyBookAcquired } from '@/lib/companion-events';

interface BookQuickViewModalProps {
  book: BookCardResult | null;
  onClose: () => void;
}

export function BookQuickViewModal({ book, onClose }: BookQuickViewModalProps) {
  const { user } = useAuth();
  const { toggleCompare, isInCompare, openCompareModal } = useCompare();
  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);

  useEffect(() => {
    if (book) {
      setLoading(true);
      setReserveSuccess(null);
      setReserveError(null);
      fetch(`/api/books/${book.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setDetails(d.data))
        .catch(() => {})
        .finally(() => setLoading(false));
      notifyBookHovered(book);
    }
  }, [book]);

  if (!book) return null;

  const handleReserve = async () => {
    if (!user) {
      setReserveError('Please sign in as a member to reserve books.');
      return;
    }
    setReserving(true);
    setReserveError(null);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Reservation failed');
      }
      setReserveSuccess(`Reservation confirmed! Waitlist Queue Position #${data.data.queuePosition}`);
      notifyBookAcquired(book);
    } catch (err: unknown) {
      setReserveError(err instanceof Error ? err.message : 'Reservation failed');
    } finally {
      setReserving(false);
    }
  };

  const isAvailable = book.availableCopies > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-3xl bg-white border border-stone-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
              Quick Preview • ISBN {book.isbn}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Book Cover */}
            <div className="sm:col-span-1">
              <div className="aspect-3/4 rounded-2xl bg-stone-100 border border-stone-200/80 overflow-hidden shadow-xs flex items-center justify-center relative">
                <BookCover
                  title={book.title}
                  coverImageUrl={book.coverImageUrl}
                  isbn={book.isbn}
                  authorName={book.authors[0]?.name}
                  categoryName={book.categories[0]?.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isAvailable ? `${book.availableCopies} available` : 'Waitlist open'}
                  </span>
                </div>
              </div>
            </div>

            {/* Book Information */}
            <div className="sm:col-span-2 space-y-3">
              <div>
                <span className="text-xs text-stone-500 font-medium">
                  {book.categories.map((c) => c.name).join(' • ')}
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 leading-snug mt-1">
                  {book.title}
                </h2>
                <p className="text-xs text-stone-600 mt-1">
                  by <span className="font-semibold text-stone-800">{book.authors.map((a) => a.name).join(', ')}</span>
                </p>
              </div>

              {/* Physical Shelf Locator */}
              <div className="p-3.5 rounded-2xl bg-[#faf8f5] border border-stone-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-stone-900 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-stone-700" /> Physical Campus Location
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  {details?.copies?.[0]?.shelfLocation ? (
                    <span>
                      <strong className="text-stone-800">{details.copies[0].shelfLocation}</strong>
                      <span className="text-stone-400"> (Barcode: {details.copies[0].barcode})</span>
                    </span>
                  ) : (
                    <span>Library Main Stacks • Computer Science Wing • 2nd Floor</span>
                  )}
                </p>
              </div>

              {/* Synopsis */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1">
                  Synopsis
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed line-clamp-4">
                  {book.description ||
                    'Comprehensive academic treatise exploring foundational and modern principles, theoretical frameworks, and practical systems implementations.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Responses */}
          {reserveError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{reserveError}</span>
            </div>
          )}

          {reserveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{reserveSuccess}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50/70 flex items-center justify-between gap-3">
          <Link
            href={`/books/${book.id}`}
            onClick={onClose}
            className="text-xs font-semibold text-stone-700 hover:text-stone-950 inline-flex items-center gap-1 transition-colors"
          >
            Full Details & Copies <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toggleCompare(book);
                onClose();
                openCompareModal();
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                isInCompare(book.id)
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300 shadow-xs'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {isInCompare(book.id) ? 'In Compare' : 'Compare'}
            </button>
            <button
              onClick={handleReserve}
              disabled={reserving || !!reserveSuccess}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5" />
              {reserving ? 'Reserving...' : reserveSuccess ? 'Reserved' : 'Reserve Title'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
