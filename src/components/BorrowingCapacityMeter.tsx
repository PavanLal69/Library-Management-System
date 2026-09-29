'use client';

import React from 'react';
import { BookOpen, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BorrowingCapacityMeterProps {
  activeLoansCount: number;
  maxBorrowLimit: number;
  unpaidFines: number;
  overdueCount: number;
}

export function BorrowingCapacityMeter({
  activeLoansCount,
  maxBorrowLimit = 5,
  unpaidFines = 0,
  overdueCount = 0,
}: BorrowingCapacityMeterProps) {
  const percentage = Math.min(100, Math.round((activeLoansCount / maxBorrowLimit) * 100));
  const isNearLimit = activeLoansCount >= maxBorrowLimit;

  return (
    <div className="rounded-2xl bg-white border border-stone-200/90 p-4 shadow-xs">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-stone-600" /> Borrowing Capacity
        </span>
        <span className="font-mono text-[11px] font-semibold text-stone-700">
          {activeLoansCount} of {maxBorrowLimit} Books
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isNearLimit ? 'bg-amber-600' : 'bg-stone-900'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Micro Status Badges */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
        <div className="flex items-center gap-1.5">
          {overdueCount > 0 ? (
            <span className="text-rose-700 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {overdueCount} Overdue
            </span>
          ) : (
            <span className="text-emerald-800 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> No Overdues
            </span>
          )}
        </div>

        <div>
          {unpaidFines > 0 ? (
            <span className="text-amber-800 font-semibold font-mono">
              ${unpaidFines.toFixed(2)} Fine Due
            </span>
          ) : (
            <span className="text-stone-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-700" /> Account in Good Standing
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
