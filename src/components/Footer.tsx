import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-stone-200/80 bg-[#faf8f5] text-stone-500 text-xs py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-stone-700" />
          <span className="font-semibold text-stone-800">Metropolitan University Library</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-200/70 text-[10px] text-stone-600 border border-stone-300/50">
            2026 Edition
          </span>
        </div>

        <div className="flex items-center gap-6 text-stone-500">
          <span>Hours: Mon-Fri 08:00 - 22:00</span>
          <span>•</span>
          <span>Circulation Desk: +1-800-555-BOOK</span>
          <span>•</span>
          <div className="flex items-center gap-1 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ACID Engine Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
