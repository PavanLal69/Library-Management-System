'use client';

import React from 'react';
import { Layers, X, ArrowRight, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useCompare } from '@/features/compare/CompareContext';
import { BookCover } from '@/components/BookCover';

export function BookCompareDock() {
  const { compareBooks, openCompareModal, removeFromCompare, clearCompare } = useCompare();

  if (compareBooks.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-stone-900/95 backdrop-blur-md text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl border border-stone-700/80 flex items-center justify-between gap-4">
        {/* Left: Indicator & Book Thumbnails */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-stone-800 text-stone-300">
            <ArrowLeftRight className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-200 whitespace-nowrap">
              Compare <span className="text-stone-400 font-normal">({compareBooks.length}/4)</span>
            </span>

            {/* Thumbnails */}
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {compareBooks.map((book) => (
                <div
                  key={book.id}
                  className="relative group w-8 h-11 rounded-md bg-stone-800 border border-stone-600 overflow-hidden shadow-sm shrink-0"
                  title={book.title}
                >
                  <BookCover
                    title={book.title}
                    coverImageUrl={book.coverImageUrl}
                    isbn={book.isbn}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCompare(book.id);
                    }}
                    className="absolute inset-0 bg-stone-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clearCompare}
            className="px-2.5 py-1.5 rounded-xl text-stone-400 hover:text-stone-200 text-xs transition-colors cursor-pointer"
            title="Clear all"
          >
            Clear
          </button>

          <button
            onClick={openCompareModal}
            className="px-4 py-2 rounded-xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
          >
            Compare Now <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
