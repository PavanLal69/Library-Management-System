'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Star, ArrowRight, MapPin, Sparkles, ArrowLeftRight } from 'lucide-react';
import { BookCardResult } from '@/server/services/BookService';
import { BookCover } from '@/components/BookCover';
import { useCompare } from '@/features/compare/CompareContext';
import { notifyBookHovered } from '@/lib/companion-events';

interface CuratedBookSpotlightProps {
  book: BookCardResult;
  onQuickView: (book: BookCardResult) => void;
}

export function CuratedBookSpotlight({ book, onQuickView }: CuratedBookSpotlightProps) {
  const { toggleCompare, isInCompare, openCompareModal } = useCompare();
  if (!book) return null;

  return (
    <div
      onMouseEnter={() => notifyBookHovered(book)}
      className="rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden mb-10 transition-all hover:border-stone-300"
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Book Cover Showcase */}
        <div className="w-full lg:w-1/3 flex justify-center">
          <div className="relative group cursor-pointer" onClick={() => onQuickView(book)}>
            <div className="w-48 sm:w-56 aspect-3/4 rounded-2xl bg-stone-100 overflow-hidden shadow-md border border-stone-200 transition-transform duration-300 group-hover:scale-102">
              <BookCover
                title={book.title}
                coverImageUrl={book.coverImageUrl}
                isbn={book.isbn}
                authorName={book.authors[0]?.name}
                categoryName={book.categories[0]?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-xs rounded-xl py-1 px-2.5 border border-stone-200/80 text-center shadow-xs">
              <span className="text-[11px] font-semibold text-stone-800">
                Click for Quick Preview
              </span>
            </div>
          </div>
        </div>

        {/* Right: Editorial Information & Call to Action */}
        <div className="w-full lg:w-2/3 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-stone-100 text-stone-800 border border-stone-200">
              Curator&apos;s Pick • {book.categories[0]?.name || 'Featured'}
            </span>
            <div className="flex items-center gap-1 text-amber-700 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>{book.averageRating} Rating</span>
            </div>
            <span className="text-stone-400 text-xs">•</span>
            <span className="text-xs text-stone-500 font-mono">Published {book.publicationYear || 2024}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 leading-tight">
            {book.title}
          </h2>

          <p className="text-sm font-medium text-stone-700">
            Authored by <span className="font-semibold text-stone-900">{book.authors.map((a) => a.name).join(', ')}</span>
          </p>

          <p className="text-sm text-stone-600 leading-relaxed max-w-2xl font-normal line-clamp-3">
            {book.description ||
              'A foundational volume in modern computing and distributed systems architecture, illuminating core principles with exceptional clarity.'}
          </p>

          {/* Location & Status Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-stone-700">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              <span>Main Campus • Central Stacks CS-04</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${book.availableCopies > 0 ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
              <span className={book.availableCopies > 0 ? 'text-emerald-800 font-semibold' : 'text-amber-800 font-semibold'}>
                {book.availableCopies > 0 ? `${book.availableCopies} Copies Available on Shelf` : 'Waitlist Active'}
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onQuickView(book)}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              Quick Preview & Reserve <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link
              href={`/books/${book.id}`}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-200 transition-colors"
            >
              View Full Shelf Hierarchy
            </Link>
            <button
              onClick={() => {
                toggleCompare(book);
                openCompareModal();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                isInCompare(book.id)
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-300 shadow-xs'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {isInCompare(book.id) ? 'Comparing Book' : 'Compare with Others'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
