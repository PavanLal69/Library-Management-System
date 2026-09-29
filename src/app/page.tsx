'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  Eye,
  ArrowLeftRight,
} from 'lucide-react';
import { useCompare } from '@/features/compare/CompareContext';
import { BookCardResult } from '@/server/services/BookService';
import { CuratedBookSpotlight } from '@/components/CuratedBookSpotlight';
import { BookQuickViewModal } from '@/components/BookQuickViewModal';
import { BookCover } from '@/components/BookCover';
import { notifyBookHovered } from '@/lib/companion-events';

export default function HomePage() {
  const [books, setBooks] = useState<BookCardResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'title' | 'year' | 'availability'>('relevance');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuickViewBook, setSelectedQuickViewBook] = useState<BookCardResult | null>(null);
  const { toggleCompare, isInCompare, openCompareModal } = useCompare();

  const categories = [
    { id: 'all', name: 'All Collections' },
    { id: 'cs', name: 'Computer Science' },
    { id: 'arch', name: 'Software Architecture' },
    { id: 'ai', name: 'AI & Machine Learning' },
    { id: 'db', name: 'Database & Systems' },
    { id: 'security', name: 'Cybersecurity' },
  ];

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (availableOnly) params.set('available', 'true');
      params.set('sort', sortBy);
      params.set('limit', '30');

      const res = await fetch(`/api/books?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: BookCardResult[] = data.data || [];

        if (selectedCategory !== 'all') {
          list = list.filter((b) =>
            b.categories.some((c) => c.name.toLowerCase().includes(selectedCategory))
          );
        }

        setBooks(list);
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, availableOnly, sortBy, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  const spotlightBook = books.find((b) => b.averageRating >= 4.8) || books[0];

  return (
    <div className="flex-1 flex flex-col pb-16 bg-[#faf8f5]">
      {/* Hero Header Section */}
      <section className="border-b border-stone-200/80 bg-gradient-to-b from-[#fdfbf7] via-[#faf8f5] to-[#f4efe6]/50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5 text-stone-600" /> University Library & Catalog
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal tracking-tight text-stone-900 leading-tight">
            What would you like to <span className="italic font-serif">read today?</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Browse physical volumes, seminal computer science treatises, and academic texts with real-time campus shelf locator.
          </p>

          {/* Hero Search Input */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-2xl overflow-hidden bg-white border border-stone-300 shadow-xs focus-within:border-stone-800 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
              <div className="pl-4 text-stone-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder='Search title, author, "Martin Kleppmann", ISBN, or keywords...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 pl-3 pr-4 bg-transparent text-stone-900 text-sm sm:text-base placeholder:text-stone-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="pr-4 text-xs font-semibold text-stone-400 hover:text-stone-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              <span className="text-stone-500 font-medium">Popular:</span>
              {['Designing Data-Intensive', 'Clean Code', 'Algorithms', 'Deep Learning', 'Microservices'].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 w-full flex-1">
        {/* Curated Spotlight Feature (Editorial banner when not searching) */}
        {!searchQuery && spotlightBook && (
          <CuratedBookSpotlight
            book={spotlightBook}
            onQuickView={(b) => setSelectedQuickViewBook(b)}
          />
        )}

        {/* Filter & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          {/* Categories Tab Group */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Right filters */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Available Copies Only</span>
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-stone-700 focus:outline-none focus:border-stone-800"
            >
              <option value="relevance">Sort: Relevance / Top Rated</option>
              <option value="title">Sort: Title (A-Z)</option>
              <option value="year">Sort: Publication Year</option>
              <option value="availability">Sort: Available Copies</option>
            </select>
          </div>
        </div>

        {/* Books Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-96 rounded-2xl bg-white border border-stone-200 animate-pulse" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">No books found matching your query</h3>
            <p className="text-xs text-stone-500 mt-1">Try relaxing filters or searching for alternate keywords or ISBN.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
            {books.map((book) => {
              const isAvailable = book.availableCopies > 0;
              return (
                <div
                  key={book.id}
                  onMouseEnter={() => notifyBookHovered(book)}
                  className="group flex flex-col rounded-2xl bg-white border border-stone-200/90 hover:border-stone-400 transition-all duration-300 overflow-hidden hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Book Cover Image */}
                  <div className="relative h-56 w-full bg-[#f5f2eb] overflow-hidden flex items-center justify-center border-b border-stone-100">
                    <BookCover
                      title={book.title}
                      coverImageUrl={book.coverImageUrl}
                      isbn={book.isbn}
                      authorName={book.authors[0]?.name}
                      categoryName={book.categories[0]?.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Availability Floating Badge */}
                    <div className="absolute top-3 right-3">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          {book.availableCopies} on Shelf
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Waitlist Open
                        </span>
                      )}
                    </div>

                    {/* Quick View & Compare Hover Actions */}
                    <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-3">
                      <button
                        onClick={() => setSelectedQuickViewBook(book)}
                        className="px-3 py-2 rounded-xl bg-white text-stone-900 text-xs font-bold shadow-md hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Quick View
                      </button>
                      <button
                        onClick={() => toggleCompare(book)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isInCompare(book.id)
                            ? 'bg-amber-400 text-stone-950 font-extrabold'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        {isInCompare(book.id) ? 'Comparing' : 'Compare'}
                      </button>
                    </div>
                  </div>

                  {/* Book Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category Tag & Rating */}
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-stone-500 font-medium tracking-wide">
                          {book.categories[0]?.name || 'General Literature'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                          <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                          <span>{book.averageRating}</span>
                        </div>
                      </div>

                      {/* Book Title */}
                      <Link href={`/books/${book.id}`}>
                        <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-2 leading-snug">
                          {book.title}
                        </h3>
                      </Link>

                      {/* Authors */}
                      <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                        by {book.authors.map((a) => a.name).join(', ') || 'Faculty'}
                      </p>

                      {/* Description Snippet */}
                      {book.description && (
                        <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed">
                          {book.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleCompare(book);
                        }}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer px-2 py-0.5 rounded-lg ${
                          isInCompare(book.id)
                            ? 'text-amber-800 bg-amber-50 border border-amber-200'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        {isInCompare(book.id) ? 'In Compare' : 'Compare'}
                      </button>
                      <Link
                        href={`/books/${book.id}`}
                        className="inline-flex items-center gap-1 text-stone-900 font-semibold group-hover:translate-x-0.5 transition-transform"
                      >
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Book Quick View Modal */}
      <BookQuickViewModal
        book={selectedQuickViewBook}
        onClose={() => setSelectedQuickViewBook(null)}
      />
    </div>
  );
}
