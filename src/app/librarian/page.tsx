'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  BookOpen,
  QrCode,
  Scan,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Layers,
  FileDown,
  Building,
  RotateCcw,
  Sparkles,
  Search,
  ShieldAlert,
} from 'lucide-react';

export default function LibrarianCirculationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Circulation Scanner State
  const [activeCircTab, setActiveCircTab] = useState<'issue' | 'return' | 'inventory'>('issue');

  // Issue Flow State
  const [memberCardInput, setMemberCardInput] = useState('LIB-2026-10001');
  const [scannedMember, setScannedMember] = useState<any | null>(null);
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState<string | null>(null);

  const [bookBarcodeInput, setBookBarcodeInput] = useState('BC-2026-1004');
  const [scannedCopy, setScannedCopy] = useState<any | null>(null);
  const [copySearching, setCopySearching] = useState(false);
  const [copySearchError, setCopySearchError] = useState<string | null>(null);

  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<any | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Return Flow State
  const [returnBarcodeInput, setReturnBarcodeInput] = useState('BC-2026-1002');
  const [returning, setReturning] = useState(false);
  const [returnResult, setReturnResult] = useState<any | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Inventory Table State
  const [inventoryStats, setInventoryStats] = useState<any | null>(null);
  const [shelves, setShelves] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetch('/api/inventory/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setInventoryStats(d.data))
        .catch(() => {});

      fetch('/api/shelves')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setShelves(d.data))
        .catch(() => {});
    }
  }, [user, authLoading, router]);

  // Member Lookup
  const handleLookupMember = async (cardNum?: string) => {
    const card = (cardNum || memberCardInput).trim();
    if (!card) return;
    setMemberSearching(true);
    setMemberSearchError(null);
    setScannedMember(null);

    try {
      const res = await fetch(`/api/members/card/${card}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Member not found');
      }
      setScannedMember(data.data);
    } catch (err: unknown) {
      setMemberSearchError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setMemberSearching(false);
    }
  };

  // Copy Lookup
  const handleLookupCopy = async (barcodeVal?: string) => {
    const bc = (barcodeVal || bookBarcodeInput).trim();
    if (!bc) return;
    setCopySearching(true);
    setCopySearchError(null);
    setScannedCopy(null);

    try {
      const res = await fetch(`/api/book-copies/${bc}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Physical copy not found');
      }
      setScannedCopy(data.data);
    } catch (err: unknown) {
      setCopySearchError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setCopySearching(false);
    }
  };

  // Execute Issue Loan
  const handleExecuteIssue = async () => {
    if (!scannedMember || !scannedCopy) return;
    setIssuing(true);
    setIssueError(null);
    setIssueResult(null);

    try {
      const res = await fetch('/api/loans/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: scannedMember.id,
          copyId: scannedCopy.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Issue operation failed');
      }

      setIssueResult(data.data);
      // Refresh member stats
      handleLookupMember(scannedMember.libraryCardNumber);
      handleLookupCopy(scannedCopy.barcode);
    } catch (err: unknown) {
      setIssueError(err instanceof Error ? err.message : 'Issue failed');
    } finally {
      setIssuing(false);
    }
  };

  // Execute Return Loan
  const handleExecuteReturn = async () => {
    const bc = returnBarcodeInput.trim();
    if (!bc) return;
    setReturning(true);
    setReturnError(null);
    setReturnResult(null);

    try {
      const res = await fetch('/api/loans/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: bc }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Return processing failed');
      }

      setReturnResult(data.data);
    } catch (err: unknown) {
      setReturnError(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setReturning(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 bg-[#faf8f5]">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden mb-8">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 flex items-center justify-center text-white shadow-xs">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-stone-900">Circulation & Inventory Desk</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                  Librarian Console
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Fast barcode issue, returns with overdue fine calculations, waitlist routing, and physical inventory tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/inventory/export"
              target="_blank"
              download
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-200 transition-colors flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4 text-stone-700" /> Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* Circulation KPI Stats */}
      {inventoryStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500">Total Physical Copies</span>
            <div className="mt-2 text-2xl font-serif font-bold text-stone-900">{inventoryStats.totalCopies}</div>
          </div>
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-800">Available on Shelf</span>
            <div className="mt-2 text-2xl font-serif font-bold text-emerald-800">{inventoryStats.available}</div>
          </div>
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-600">Currently Borrowed</span>
            <div className="mt-2 text-2xl font-serif font-bold text-stone-900">{inventoryStats.borrowed}</div>
          </div>
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-800">Reserved for Pickup</span>
            <div className="mt-2 text-2xl font-serif font-bold text-amber-800">{inventoryStats.reserved}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6">
        <button
          onClick={() => setActiveCircTab('issue')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeCircTab === 'issue'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Fast Issue (Check-Out)
        </button>
        <button
          onClick={() => setActiveCircTab('return')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeCircTab === 'return'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Fast Return (Check-In & Fines)
        </button>
      </div>

      {/* TAB 1: FAST ISSUE WORKFLOW */}
      {activeCircTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step 1: Member Scan */}
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-stone-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center text-xs font-mono font-bold">
                  1
                </span>
                Scan Member Library Card
              </h3>
              <button
                onClick={() => handleLookupMember('LIB-2026-10001')}
                className="text-[11px] text-stone-600 hover:text-stone-900 underline font-medium cursor-pointer"
              >
                Auto-Fill Demo Card
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan or enter card (e.g. LIB-2026-10001)..."
                value={memberCardInput}
                onChange={(e) => setMemberCardInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-mono focus:outline-none focus:border-stone-900 focus:bg-white"
              />
              <button
                onClick={() => handleLookupMember()}
                disabled={memberSearching}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {memberSearching ? 'Scanning...' : 'Verify'}
              </button>
            </div>

            {memberSearchError && (
              <p className="text-xs text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {memberSearchError}
              </p>
            )}

            {scannedMember && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    {scannedMember.firstName} {scannedMember.lastName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {scannedMember.membershipStatus}
                  </span>
                </div>
                <div className="text-stone-500 text-[11px]">{scannedMember.department}</div>
                <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-2 text-stone-600">
                  <div>
                    Active Loans:{' '}
                    <span className="font-bold text-stone-900">
                      {scannedMember.activeLoansCount} / {scannedMember.maxBorrowLimit}
                    </span>
                  </div>
                  <div>
                    Unpaid Fines:{' '}
                    <span
                      className={`font-bold ${
                        scannedMember.unpaidFineTotal > 0 ? 'text-amber-800' : 'text-emerald-800'
                      }`}
                    >
                      ${scannedMember.unpaidFineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Book Copy Scan */}
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-serif font-bold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center text-xs font-mono font-bold">
                    2
                  </span>
                  Scan Physical Book Barcode
                </h3>
                <button
                  onClick={() => handleLookupCopy('BC-2026-1004')}
                  className="text-[11px] text-stone-600 hover:text-stone-900 underline font-medium cursor-pointer"
                >
                  Auto-Fill Demo Copy
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan copy barcode (e.g. BC-2026-1004)..."
                  value={bookBarcodeInput}
                  onChange={(e) => setBookBarcodeInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-mono focus:outline-none focus:border-stone-900 focus:bg-white"
                />
                <button
                  onClick={() => handleLookupCopy()}
                  disabled={copySearching}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {copySearching ? 'Scanning...' : 'Verify'}
                </button>
              </div>

              {copySearchError && (
                <p className="text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {copySearchError}
                </p>
              )}

              {scannedCopy && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm truncate">{scannedCopy.bookTitle}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        scannedCopy.status === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {scannedCopy.status}
                    </span>
                  </div>
                  <div className="text-stone-500 text-[11px]">
                    Location: <span className="text-stone-800 font-medium">{scannedCopy.shelfLocation}</span>
                  </div>
                  <div className="text-stone-400 text-[10px] font-mono">
                    Barcode: {scannedCopy.barcode} • Accession: {scannedCopy.accessionNumber}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Issue Confirmation & Receipt */}
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-serif font-bold text-stone-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Transaction Verification
              </h3>
              <p className="text-xs text-stone-500">
                Confirm borrowing policies: 14-day checkout period, max 2 renewals, $0.50/day late fine policy.
              </p>

              {issueError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
                  <span>{issueError}</span>
                </div>
              )}

              {issueResult && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-xs">
                  <div className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Book Successfully Checked Out!
                  </div>
                  <p>
                    <strong className="text-stone-900">Title:</strong> {issueResult.book?.title}
                  </p>
                  <p>
                    <strong className="text-stone-900">Due Date:</strong> {new Date(issueResult.loan?.dueAt).toLocaleDateString()}
                  </p>
                  <p className="font-mono text-[10px] text-stone-500">
                    Loan ID: {issueResult.loan?.id}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-stone-200">
              <button
                onClick={handleExecuteIssue}
                disabled={!scannedMember || !scannedCopy || issuing}
                className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {issuing ? 'Executing Transaction...' : 'Complete Issue & Assign Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAST RETURN WORKFLOW */}
      {activeCircTab === 'return' && (
        <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-stone-800" /> Fast Return & Fine Assessment
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Scan returned physical book copy. The system automatically reconciles active loan records, computes overdue penalties, and routes reserved books to waiting members.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-stone-700 font-semibold">Physical Copy Barcode</label>
              <button
                onClick={() => setReturnBarcodeInput('BC-2026-1002')}
                className="text-[11px] text-stone-600 hover:text-stone-900 underline font-medium cursor-pointer"
              >
                Auto-Fill Overdue Copy (BC-2026-1002)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan copy barcode..."
                value={returnBarcodeInput}
                onChange={(e) => setReturnBarcodeInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-sm font-mono focus:outline-none focus:border-stone-900 focus:bg-white"
              />
              <button
                onClick={handleExecuteReturn}
                disabled={returning}
                className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {returning ? 'Processing...' : 'Process Return'}
              </button>
            </div>
          </div>

          {returnError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
              <span>{returnError}</span>
            </div>
          )}

          {returnResult && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Return Reconciled Successfully
                </span>
                <span className="font-mono text-stone-500">{returnResult.copy?.barcode}</span>
              </div>

              <div className="text-stone-900 font-serif font-bold text-sm">{returnResult.book?.title}</div>

              <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-4 text-stone-600">
                <div>
                  Overdue Status:{' '}
                  <span className={returnResult.overdueDays > 0 ? 'text-rose-700 font-bold' : 'text-emerald-800 font-bold'}>
                    {returnResult.overdueDays > 0 ? `${returnResult.overdueDays} Days Late` : 'On Time'}
                  </span>
                </div>
                <div>
                  Penalty Assessed:{' '}
                  <span className={returnResult.fine ? 'text-rose-700 font-bold' : 'text-emerald-800 font-bold'}>
                    {returnResult.fine ? `$${returnResult.fine.amount}` : '$0.00'}
                  </span>
                </div>
              </div>

              {returnResult.wasReservedByNext && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Copy routed to Waitlist Position #1. Member notified to collect within 48h.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
