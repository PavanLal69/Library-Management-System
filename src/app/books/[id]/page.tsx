'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  BookOpen,
  ArrowLeft,
  Star,
  MapPin,
  QrCode,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Building,
  User,
  ArrowLeftRight,
} from 'lucide-react';
import { BookCover } from '@/components/BookCover';
import { useCompare } from '@/features/compare/CompareContext';
import { BookCardResult } from '@/server/services/BookService';
import { notifyBookHovered, notifyBookAcquired } from '@/lib/companion-events';

interface BookDetailData {
  id: string;
  isbn: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverImageUrl: string | null;
  publicationYear: number | null;
  edition: string | null;
  pages: number | null;
  averageRating: number;
  totalCopies: number;
  availableCopies: number;
  authors: Array<{ id: string; name: string; biography?: string | null }>;
  categories: Array<{ id: string; name: string }>;
  publisher: { id: string; name: string } | null;
  language: { id: string; name: string } | null;
  copies: Array<{
    id: string;
    barcode: string;
    qrCode: string;
    accessionNumber: string;
    shelfLocation: string;
    condition: string;
    status: string;
    price: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    review: string;
    createdAt: string;
  }>;
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toggleCompare, isInCompare, openCompareModal } = useCompare();

  const [book, setBook] = useState<BookDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<{ barcode: string; qrCode: string } | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/books/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data) {
            setBook(data.data);
            notifyBookHovered(data.data);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleReserve = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setReserving(true);
    setReserveError(null);
    setReserveSuccess(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to place reservation');
      }

      setReserveSuccess(`Reservation confirmed! You are waitlist position #${data.data.queuePosition}.`);
      if (book) notifyBookAcquired(book);
    } catch (err: unknown) {
      setReserveError(err instanceof Error ? err.message : 'Reservation failed');
    } finally {
      setReserving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 w-full animate-pulse bg-[#faf8f5]">
        <div className="h-6 w-36 bg-stone-200 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="h-96 bg-stone-200 rounded-2xl"></div>
          <div className="md:col-span-2 space-y-4">
            <div className="h-10 bg-stone-200 rounded"></div>
            <div className="h-6 w-1/2 bg-stone-200 rounded"></div>
            <div className="h-32 bg-stone-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-[#faf8f5]">
        <h2 className="text-2xl font-serif font-bold text-stone-900">Book Not Found</h2>
        <p className="text-stone-500 mt-2 text-sm">The catalog record you requested does not exist.</p>
        <Link href="/" className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-stone-900 rounded-xl text-xs font-semibold text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const isAvailable = book.availableCopies > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full bg-[#faf8f5]">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog Search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Cover & Quick Actions */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-xs">
            <div className="h-96 w-full bg-[#f4efe6] rounded-xl overflow-hidden flex items-center justify-center border border-stone-100">
              <BookCover
                title={book.title}
                coverImageUrl={book.coverImageUrl}
                isbn={book.isbn}
                authorName={book.authors[0]?.name}
                categoryName={book.categories[0]?.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Status Pill */}
            <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 block font-medium">Availability</span>
                <span className={`text-sm font-bold ${isAvailable ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {isAvailable ? `${book.availableCopies} of ${book.totalCopies} Copies Ready` : 'All Copies Checked Out'}
                </span>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isAvailable ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isAvailable ? 'In Circulation' : 'Waitlist Active'}
              </div>
            </div>

            {/* Reserve / Hold Action Button */}
            <div className="mt-4">
              <button
                onClick={handleReserve}
                disabled={reserving}
                className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Bookmark className="w-4 h-4" />
                {reserving ? 'Processing...' : isAvailable ? 'Reserve Copy for Pickup' : 'Join Waitlist Queue'}
              </button>

              <button
                onClick={() => {
                  const bookCard: BookCardResult = {
                    id: book.id,
                    isbn: book.isbn,
                    title: book.title,
                    subtitle: book.subtitle,
                    description: book.description,
                    coverImageUrl: book.coverImageUrl,
                    publicationYear: book.publicationYear,
                    edition: book.edition,
                    authors: book.authors.map((a) => ({ id: a.id, name: a.name, isPrimary: true })),
                    categories: book.categories.map((c) => ({ id: c.id, name: c.name })),
                    publisherName: book.publisher?.name || null,
                    totalCopies: book.totalCopies,
                    availableCopies: book.availableCopies,
                    averageRating: book.averageRating,
                    reviewCount: book.reviews?.length || 0,
                  };
                  toggleCompare(bookCard);
                  openCompareModal();
                }}
                className={`w-full mt-2.5 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isInCompare(book.id)
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-800'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {isInCompare(book.id) ? 'Comparing Book (View Compare)' : 'Compare with Other Books'}
              </button>

              {reserveSuccess && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{reserveSuccess}</span>
                </div>
              )}

              {reserveError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{reserveError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bibliographic Metadata Card */}
          <div className="rounded-2xl bg-white border border-stone-200 p-5 text-xs space-y-3 shadow-xs">
            <h4 className="font-semibold text-stone-900 uppercase tracking-wider text-[11px]">Bibliographic Data</h4>
            <div className="flex justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">ISBN-13</span>
              <span className="font-mono text-stone-800">{book.isbn}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Publisher</span>
              <span className="text-stone-800">{book.publisher?.name || "O'Reilly / Academic"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Year</span>
              <span className="text-stone-800">{book.publicationYear || 2024}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Edition</span>
              <span className="text-stone-800">{book.edition || '1st Edition'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Pages</span>
              <span className="text-stone-800">{book.pages || 520}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-stone-500">Language</span>
              <span className="text-stone-800">{book.language?.name || 'English'}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Title, Details, Physical Shelf Locator */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            {/* Category Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {book.categories.map((c) => (
                <span
                  key={c.id}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200"
                >
                  {c.name}
                </span>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold ml-2">
                <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                <span>{book.averageRating}</span>
                <span className="text-stone-400 font-normal">({book.reviews?.length || 24} reviews)</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
              {book.title}
            </h1>
            {book.subtitle && (
              <h2 className="text-base text-stone-600 font-normal mt-1">
                {book.subtitle}
              </h2>
            )}

            {/* Authors */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500">Authored by</span>
              {book.authors.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-800">
                  <User className="w-3 h-3 text-stone-500" />
                  <span>{a.name}</span>
                </div>
              ))}
            </div>

            {/* Synopsis */}
            <div className="mt-6 p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Subject Synopsis</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                {book.description ||
                  'A landmark text providing comprehensive foundational theory, rigorous engineering case studies, and advanced benchmarks. Standard reference in graduate computer science curriculums.'}
              </p>
            </div>
          </div>

          {/* Physical Copies & Shelf Location Section */}
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-stone-700" /> Physical Copies & Campus Shelf Tracking
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Trace physical volume copies to their exact campus shelf, rack, and accession number.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                {book.copies.length} Copies Cataloged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">Accession / Barcode</th>
                    <th className="pb-3">Campus Shelf Location</th>
                    <th className="pb-3">Condition</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">QR Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {book.copies.map((copy) => (
                    <tr key={copy.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 pl-2 font-mono text-stone-800">
                        <div className="font-semibold text-stone-900">{copy.barcode}</div>
                        <div className="text-[10px] text-stone-400">{copy.accessionNumber}</div>
                      </td>
                      <td className="py-3.5 text-stone-700">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-medium text-stone-900">{copy.shelfLocation}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {copy.condition}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            copy.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : copy.status === 'BORROWED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              copy.status === 'AVAILABLE' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                          {copy.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => setSelectedQr({ barcode: copy.barcode, qrCode: copy.qrCode })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-stone-600" /> QR Code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Inspection Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <h4 className="font-bold text-stone-900 text-base">Physical Item QR Tag</h4>
            <p className="text-xs text-stone-500 mt-0.5 font-mono">{selectedQr.barcode}</p>

            <div className="my-5 p-3 bg-stone-50 border border-stone-200 rounded-xl inline-block">
              <img src={selectedQr.qrCode} alt="Item QR" className="w-44 h-44 mx-auto" />
            </div>

            <p className="text-[11px] text-stone-500">
              Scan with the librarian circulation scanner or smartphone camera for fast checkout.
            </p>

            <button
              onClick={() => setSelectedQr(null)}
              className="mt-5 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
