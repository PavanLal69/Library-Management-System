'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BookCardResult } from '@/server/services/BookService';

interface CompareContextType {
  compareBooks: BookCardResult[];
  isCompareModalOpen: boolean;
  addToCompare: (book: BookCardResult) => void;
  removeFromCompare: (bookId: string) => void;
  toggleCompare: (book: BookCardResult) => void;
  clearCompare: () => void;
  openCompareModal: () => void;
  closeCompareModal: () => void;
  isInCompare: (bookId: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareBooks, setCompareBooks] = useState<BookCardResult[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('lms_compare_books');
      if (stored) {
        setCompareBooks(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('lms_compare_books', JSON.stringify(compareBooks));
    } catch {
      // Ignore
    }
  }, [compareBooks]);

  const addToCompare = (book: BookCardResult) => {
    setCompareBooks((prev) => {
      if (prev.some((b) => b.id === book.id)) return prev;
      if (prev.length >= 4) {
        // Replace oldest or cap at 4
        return [...prev.slice(1), book];
      }
      return [...prev, book];
    });
  };

  const removeFromCompare = (bookId: string) => {
    setCompareBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  const toggleCompare = (book: BookCardResult) => {
    setCompareBooks((prev) => {
      if (prev.some((b) => b.id === book.id)) {
        return prev.filter((b) => b.id !== book.id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), book];
      }
      return [...prev, book];
    });
  };

  const clearCompare = () => {
    setCompareBooks([]);
    setIsCompareModalOpen(false);
  };

  const openCompareModal = () => setIsCompareModalOpen(true);
  const closeCompareModal = () => setIsCompareModalOpen(false);

  const isInCompare = (bookId: string) => compareBooks.some((b) => b.id === bookId);

  return (
    <CompareContext.Provider
      value={{
        compareBooks,
        isCompareModalOpen,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        openCompareModal,
        closeCompareModal,
        isInCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
