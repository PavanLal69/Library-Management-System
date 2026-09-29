'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  Command,
  X,
  User,
  ShieldCheck,
  Scan,
} from 'lucide-react';
import { BookCardResult } from '@/server/services/BookService';
import { BookCover } from '@/components/BookCover';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookCardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or custom event
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live search debounced
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(query.trim())}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.data || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Command search error:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Quick navigation items when query is empty
  const defaultShortcuts = [
    { label: 'Browse All Books', sub: 'Explore full catalog & collections', path: '/', icon: BookOpen },
    { label: 'Member Dashboard', sub: 'Active loans, renewals & waitlist', path: '/member', icon: User },
    { label: 'Circulation Desk', sub: 'Fast barcode issue & returns', path: '/librarian', icon: Scan },
    { label: 'Admin Console', sub: 'System analytics & settings', path: '/admin', icon: ShieldCheck },
  ];

  const handleSelectPath = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = query.trim() ? results.length : defaultShortcuts.length;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim() && results[selectedIndex]) {
        handleSelectPath(`/books/${results[selectedIndex].id}`);
      } else if (!query.trim() && defaultShortcuts[selectedIndex]) {
        handleSelectPath(defaultShortcuts[selectedIndex].path);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 bg-stone-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white border border-stone-200/90 shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200 bg-stone-50/60">
          <Search className="w-5 h-5 text-stone-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a title, author, ISBN, or navigate..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm sm:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-stone-400 hover:text-stone-700 p-1 text-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-stone-400 bg-stone-200/60 rounded border border-stone-300">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="py-8 text-center text-xs text-stone-400">
              Searching library catalog...
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="py-8 text-center text-xs text-stone-500">
              No catalog matches for &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Book Search Results */}
          {!loading && query.trim() && results.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Matching Catalog Titles ({results.length})
              </div>
              {results.map((book, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={book.id}
                    onClick={() => handleSelectPath(`/books/${book.id}`)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-8 h-10 bg-stone-100 rounded border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                        <BookCover
                          title={book.title}
                          coverImageUrl={book.coverImageUrl}
                          isbn={book.isbn}
                          authorName={book.authors[0]?.name}
                          categoryName={book.categories[0]?.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-serif font-bold text-stone-900 truncate">
                          {book.title}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {book.authors.map((a) => a.name).join(', ')} • {book.categories[0]?.name || 'Book'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          book.availableCopies > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Waitlist'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Default Shortcuts when empty */}
          {!query.trim() && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Quick Navigation & Workspaces
              </div>
              {defaultShortcuts.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelectPath(item.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900">{item.label}</p>
                        <p className="text-[11px] text-stone-500">{item.sub}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded text-[10px]">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded text-[10px]">↵</kbd> to select
            </span>
          </div>
          <span className="font-medium text-stone-600">Metropolitan Library 2026</span>
        </div>
      </div>
    </div>
  );
}
