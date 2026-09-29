'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Search,
  Star,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Layers,
  Building,
  Trash2,
} from 'lucide-react';
import { useCompare } from '@/features/compare/CompareContext';
import { BookCardResult } from '@/server/services/BookService';
import { BookCover } from '@/components/BookCover';

export function BookCompareModal() {
  const {
    compareBooks,
    isCompareModalOpen,
    closeCompareModal,
    removeFromCompare,
    addToCompare,
    clearCompare,
  } = useCompare();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookCardResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Search for additional books to compare
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(searchQuery.trim())}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          // Filter out books already in comparison
          const filtered = (data.data || []).filter(
            (b: BookCardResult) => !compareBooks.some((cb) => cb.id === b.id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error('Failed to search books for comparison:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, compareBooks]);

  if (!isCompareModalOpen) return null;

  // Highlights
  const highestRating = Math.max(...compareBooks.map((b) => b.averageRating || 0));
  const mostAvailable = Math.max(...compareBooks.map((b) => b.availableCopies || 0));
  const newestYear = Math.max(...compareBooks.map((b) => b.publicationYear || 0));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-[#faf8f5]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-stone-900 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900 leading-tight">
                Compare Selected Books
              </h2>
              <p className="text-xs text-stone-500">
                Comparing {compareBooks.length} of 4 volumes side-by-side
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {compareBooks.length > 0 && (
              <button
                onClick={clearCompare}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
            <button
              onClick={closeCompareModal}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Search Bar to Add Another Book */}
        {compareBooks.length < 4 && (
          <div className="px-6 py-3 border-b border-stone-100 bg-stone-50/70 relative">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder='Search title, author, or ISBN to add another book...'
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                className="w-full py-2 pl-9 pr-4 rounded-xl bg-white border border-stone-300 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-800"
              />
            </div>

            {/* Search Dropdown Results */}
            {showSearchDropdown && (searchQuery.trim().length > 0 || searchResults.length > 0) && (
              <div className="absolute left-6 right-6 sm:right-auto sm:w-[480px] top-full mt-1.5 bg-white rounded-2xl border border-stone-200 shadow-xl z-30 max-h-72 overflow-y-auto p-2">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-stone-400">Searching catalog...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400">
                    No matching books found or already added
                  </div>
                ) : (
                  searchResults.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        addToCompare(b);
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-12 rounded bg-stone-100 shrink-0 overflow-hidden border border-stone-200">
                          <BookCover
                            title={b.title}
                            coverImageUrl={b.coverImageUrl}
                            isbn={b.isbn}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-900 truncate">{b.title}</p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {b.authors.map((a) => a.name).join(', ') || 'Faculty'}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-1 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-bold flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Content Body / Side-by-side Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {compareBooks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="text-base font-bold text-stone-800">No books selected for comparison</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Select books from the catalog or use the search above to compare their architecture, topics, and shelf availability.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid gap-4 min-w-[680px]"
                style={{
                  gridTemplateColumns: `repeat(${compareBooks.length + (compareBooks.length < 4 ? 1 : 0)}, minmax(220px, 1fr))`,
                }}
              >
                {/* Book Columns */}
                {compareBooks.map((book) => {
                  const isAvailable = book.availableCopies > 0;
                  const isHighestRating = book.averageRating === highestRating && highestRating > 0;
                  const isMostAvailable = book.availableCopies === mostAvailable && mostAvailable > 0;
                  const isNewest = book.publicationYear === newestYear && newestYear > 0;

                  return (
                    <div
                      key={book.id}
                      className="rounded-2xl bg-white border border-stone-200/90 p-4.5 flex flex-col justify-between shadow-xs hover:border-stone-300 transition-all"
                    >
                      {/* Top Header Card */}
                      <div className="space-y-4">
                        {/* Remove Action */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400">
                            ISBN {book.isbn.slice(0, 10)}...
                          </span>
                          <button
                            onClick={() => removeFromCompare(book.id)}
                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove from comparison"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Cover Image */}
                        <div className="h-56 w-full rounded-xl bg-stone-100 overflow-hidden shadow-xs border border-stone-200 relative group">
                          <BookCover
                            title={book.title}
                            coverImageUrl={book.coverImageUrl}
                            isbn={book.isbn}
                            authorName={book.authors[0]?.name}
                            categoryName={book.categories[0]?.name}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                          {isHighestRating && (
                            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                              <Award className="w-3 h-3" /> Top Rated
                            </div>
                          )}
                        </div>

                        {/* Title & Author */}
                        <div>
                          <h3 className="font-serif font-bold text-base text-stone-900 leading-snug line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                            by {book.authors.map((a) => a.name).join(', ') || 'Faculty Authors'}
                          </p>
                        </div>

                        {/* Comparison Attributes Table */}
                        <div className="space-y-3 pt-2 text-xs border-t border-stone-100">
                          {/* Availability */}
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500">Availability</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isAvailable
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {isAvailable ? `${book.availableCopies} on Shelf` : 'Waitlist'}
                            </span>
                          </div>

                          {/* Rating */}
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500">Community Score</span>
                            <div className="flex items-center gap-1 text-amber-700 font-bold text-xs">
                              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                              <span>{book.averageRating}</span>
                              <span className="text-stone-400 font-normal text-[10px]">
                                ({book.reviewCount})
                              </span>
                            </div>
                          </div>

                          {/* Category */}
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500">Discipline</span>
                            <span className="font-medium text-stone-800 text-right truncate max-w-[130px]">
                              {book.categories[0]?.name || 'Computer Science'}
                            </span>
                          </div>

                          {/* Publication & Edition */}
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500">Edition & Year</span>
                            <span className="font-mono text-stone-700">
                              {book.publicationYear || 2024} • {book.edition || '1st'}
                            </span>
                          </div>

                          {/* Full Synopsis Snippet */}
                          {book.description && (
                            <div className="pt-2 border-t border-stone-100">
                              <span className="text-[11px] font-semibold text-stone-700 block mb-1">
                                Scope & Treatise:
                              </span>
                              <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-3">
                                {book.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/books/${book.id}`}
                          onClick={closeCompareModal}
                          className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                        >
                          View Details <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Empty Slot Card to prompt adding more */}
                {compareBooks.length < 4 && (
                  <div
                    onClick={() => {
                      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (input) input.focus();
                    }}
                    className="rounded-2xl border-2 border-dashed border-stone-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-stone-400 hover:bg-stone-50/50 transition-all min-h-[420px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif font-bold text-sm text-stone-800">Add Another Book</h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-[160px]">
                      Compare up to 4 books simultaneously
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
