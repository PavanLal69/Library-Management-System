'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  BookOpen,
  Clock,
  AlertTriangle,
  CreditCard,
  Bookmark,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { BookCardResult } from '@/server/services/BookService';
import { BorrowingCapacityMeter } from '@/components/BorrowingCapacityMeter';
import { BookCover } from '@/components/BookCover';

export default function MemberDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'loans' | 'reservations' | 'fines' | 'recommendations'>('loans');
  const [loans, setLoans] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<BookCardResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fine payment modal state
  const [selectedFineForPay, setSelectedFineForPay] = useState<any | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Renewal state
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchMemberData();
    }
  }, [user, authLoading, router]);

  const fetchMemberData = async () => {
    setIsLoading(true);
    try {
      const [loansRes, resRes, finesRes, recsRes] = await Promise.all([
        fetch('/api/loans'),
        fetch('/api/reservations'),
        fetch('/api/fines'),
        fetch('/api/recommendations'),
      ]);

      if (loansRes.ok) {
        const d = await loansRes.json();
        setLoans(d.data || []);
      }
      if (resRes.ok) {
        const d = await resRes.json();
        setReservations(d.data || []);
      }
      if (finesRes.ok) {
        const d = await finesRes.json();
        setFines(d.data || []);
      }
      if (recsRes.ok) {
        const d = await recsRes.json();
        setRecommendations(d.data || []);
      }
    } catch (err) {
      console.error('Failed to load member dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenew = async (loanId: string) => {
    setRenewingId(loanId);
    setActionMessage(null);
    try {
      const res = await fetch('/api/loans/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Renewal rejected by library policy');
      }
      setActionMessage('Loan successfully renewed for 14 additional days!');
      fetchMemberData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : 'Renewal failed');
    } finally {
      setRenewingId(null);
    }
  };

  const handleCancelReservation = async (resId: string) => {
    try {
      const res = await fetch(`/api/reservations/${resId}/cancel`, { method: 'POST' });
      if (res.ok) {
        fetchMemberData();
      }
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
    }
  };

  const handleExecutePayment = async () => {
    if (!selectedFineForPay) return;
    setPaying(true);
    setPayError(null);
    setPaySuccess(null);

    try {
      // 1. Create payment intent
      const intentRes = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fineId: selectedFineForPay.id }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok || !intentData.success) {
        throw new Error(intentData.error?.message || 'Failed to create payment intent');
      }

      // 2. Verify payment server-side via Sandbox adapter
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fineId: selectedFineForPay.id,
          providerName: intentData.data.provider,
          transactionId: intentData.data.transactionId,
          paymentMethod: 'TEST_CARD_4242',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error?.message || 'Payment settlement rejected');
      }

      setPaySuccess('Payment confirmed! Fine balance cleared.');
      setTimeout(() => {
        setSelectedFineForPay(null);
        setPaySuccess(null);
        fetchMemberData();
      }, 1500);
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 w-full animate-pulse space-y-6 bg-[#faf8f5]">
        <div className="h-32 bg-stone-200 rounded-3xl"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-stone-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const overdueLoans = activeLoans.filter((l) => l.isOverdue);
  const pendingFines = fines.filter((f) => f.status === 'PENDING' || f.status === 'PARTIALLY_PAID');
  const totalUnpaidFines = pendingFines.reduce(
    (sum, f) => sum + parseFloat(f.amount) - parseFloat(f.paidAmount),
    0
  );
  const activeReservations = reservations.filter((r) =>
    ['PENDING', 'AVAILABLE_FOR_PICKUP'].includes(r.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 bg-[#faf8f5]">
      {/* Member Profile Banner */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 flex items-center justify-center text-lg font-bold text-white uppercase shadow-xs">
              {user?.firstName[0]}
              {user?.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-stone-900">
                  {user?.firstName} {user?.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {user?.memberProfile?.membershipStatus || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-3">
                <span className="font-mono text-stone-800">
                  Card: {user?.memberProfile?.libraryCardNumber || 'LIB-2026-DEFAULT'}
                </span>
                <span>•</span>
                <span>{user?.memberProfile?.department || 'Computer Science'}</span>
                <span>•</span>
                <span>Limit: {user?.memberProfile?.maxBorrowLimit || 5} Books</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> Browse Catalog
            </Link>
          </div>
        </div>
      </div>

      {/* Global Action Message Banner */}
      {actionMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-stone-100 border border-stone-300 text-stone-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-stone-700" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-500 hover:text-stone-900 cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Borrowing Capacity & Health Meter */}
      <div className="mb-6">
        <BorrowingCapacityMeter
          activeLoansCount={activeLoans.length}
          maxBorrowLimit={user?.memberProfile?.maxBorrowLimit || 5}
          unpaidFines={totalUnpaidFines}
          overdueCount={overdueLoans.length}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Current Checkouts</span>
            <BookOpen className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{activeLoans.length}</span>
            <span className="text-xs text-stone-400">/ {user?.memberProfile?.maxBorrowLimit || 5} limit</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Overdue Items</span>
            <AlertTriangle className={`w-4 h-4 ${overdueLoans.length > 0 ? 'text-rose-600' : 'text-stone-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${overdueLoans.length > 0 ? 'text-rose-700' : 'text-stone-900'}`}>
              {overdueLoans.length}
            </span>
            <span className="text-xs text-stone-400">
              {overdueLoans.length > 0 ? 'Action required' : 'All on time'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Outstanding Fines</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${totalUnpaidFines > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ${totalUnpaidFines.toFixed(2)}
            </span>
            <span className="text-xs text-stone-400">
              {totalUnpaidFines > 0 ? 'Unpaid balance' : 'Zero balance'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Active Waitlists</span>
            <Bookmark className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{activeReservations.length}</span>
            <span className="text-xs text-stone-400">Hold requests</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'loans'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Active Loans ({activeLoans.length})
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'reservations'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Waitlists & Holds ({activeReservations.length})
        </button>
        <button
          onClick={() => setActiveTab('fines')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'fines'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Fines & Payments (${totalUnpaidFines.toFixed(2)})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'recommendations'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Recommended for You
        </button>
      </div>

      {/* Tab 1: Active Loans */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {activeLoans.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-stone-200">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-800">You have no active book loans.</p>
              <p className="text-xs text-stone-500 mt-1">Search the catalog and check out your first book.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-stone-900 hover:underline"
              >
                Browse Collection <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="rounded-2xl bg-white border border-stone-200 p-5 flex flex-col justify-between shadow-xs"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-28 bg-[#f5f2eb] rounded-xl overflow-hidden shrink-0 border border-stone-100 flex items-center justify-center">
                      {loan.bookCover ? (
                        <img src={loan.bookCover} alt={loan.bookTitle} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-8 h-8 text-stone-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-stone-400 truncate">{loan.copyBarcode}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            loan.isOverdue
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {loan.isOverdue ? 'OVERDUE' : `${loan.daysRemaining} Days Left`}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-stone-900 mt-1 line-clamp-1">{loan.bookTitle}</h4>
                      <p className="text-xs text-stone-500 mt-1">
                        Due: {new Date(loan.dueAt).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Renewals: {loan.renewedCount} of 2
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <Link
                      href={`/books/${loan.bookId}`}
                      className="text-xs text-stone-500 hover:text-stone-900 font-medium"
                    >
                      Book Details
                    </Link>
                    <button
                      onClick={() => handleRenew(loan.id)}
                      disabled={renewingId === loan.id || loan.isOverdue || loan.renewedCount >= 2}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${renewingId === loan.id ? 'animate-spin' : ''}`} />
                      {loan.isOverdue ? 'Overdue - Cannot Renew' : loan.renewedCount >= 2 ? 'Limit Reached' : 'Renew Loan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reservations & Waitlists */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {activeReservations.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-stone-200">
              <Bookmark className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-800">You have no active hold requests.</p>
              <p className="text-xs text-stone-500 mt-1">When books have 0 available copies, you can join the queue.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-xs">
              {activeReservations.map((res) => (
                <div key={res.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-[#f5f2eb] rounded-lg overflow-hidden shrink-0 border border-stone-100 flex items-center justify-center">
                      {res.bookCover ? (
                        <img src={res.bookCover} alt={res.bookTitle} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-stone-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-stone-900">{res.bookTitle}</h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Reserved on {new Date(res.reservedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            res.status === 'AVAILABLE_FOR_PICKUP'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {res.status === 'AVAILABLE_FOR_PICKUP'
                            ? 'READY FOR PICKUP AT CIRCULATION DESK'
                            : `Waitlist Position #${res.queuePosition}`}
                        </span>
                        {res.availableUntil && (
                          <span className="text-[10px] text-amber-800 font-mono">
                            Hold expires: {new Date(res.availableUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCancelReservation(res.id)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel Hold
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fines & Payments */}
      {activeTab === 'fines' && (
        <div className="space-y-4">
          {fines.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-stone-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-800">Clean Account Record</p>
              <p className="text-xs text-stone-500 mt-1">You have zero outstanding or past fines.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-xs">
              {fines.map((fine) => {
                const remaining = parseFloat(fine.amount) - parseFloat(fine.paidAmount);
                const isPaid = fine.status === 'PAID' || remaining <= 0;

                return (
                  <div key={fine.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">${parseFloat(fine.amount).toFixed(2)}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : fine.status === 'WAIVED'
                              ? 'bg-stone-100 text-stone-600 border-stone-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {fine.status}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono uppercase">{fine.type}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">{fine.reason || 'Library fine assessment'}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Assessed on {new Date(fine.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      {!isPaid && fine.status !== 'WAIVED' && (
                        <button
                          onClick={() => setSelectedFineForPay(fine)}
                          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay Now (${remaining.toFixed(2)})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Deterministic Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs text-stone-600 flex items-center gap-2 shadow-xs">
            <Sparkles className="w-4 h-4 text-stone-700 shrink-0" />
            <span>
              Suggestions generated deterministically from your reading preferences, borrow history, and campus shelf availability.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/books/${rec.id}`}
                className="group rounded-2xl bg-white border border-stone-200 p-4 hover:border-stone-400 transition-all flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="h-44 w-full bg-[#f5f2eb] rounded-xl overflow-hidden mb-3 flex items-center justify-center border border-stone-100">
                    <BookCover
                      title={rec.title}
                      coverImageUrl={rec.coverImageUrl}
                      isbn={rec.isbn}
                      authorName={rec.authors[0]?.name}
                      categoryName={rec.categories[0]?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-2">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                    {rec.authors.map((a) => a.name).join(', ')}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-900 font-semibold">
                  <span>{rec.availableCopies > 0 ? `${rec.availableCopies} on Shelf` : 'Waitlist'}</span>
                  <span>View &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fine Payment Modal (Sandboxed Provider Integration) */}
      {selectedFineForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-stone-700" /> Settle Library Fine
              </h3>
              <button
                onClick={() => setSelectedFineForPay(null)}
                className="text-stone-400 hover:text-stone-900 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 mb-5">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>Fine Reason:</span>
                <span className="font-medium text-stone-800">{selectedFineForPay.reason}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Amount Due:</span>
                <span className="text-stone-900">${parseFloat(selectedFineForPay.amount).toFixed(2)}</span>
              </div>
            </div>

            {paySuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{paySuccess}</span>
              </div>
            )}

            {payError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <div className="space-y-2 mb-6">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                <span className="text-stone-500">Gateway:</span>
                <span className="font-mono text-stone-800 font-semibold">Dev Sandbox Gateway</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                <span className="text-stone-500">Card Simulator:</span>
                <span className="font-mono text-stone-600">•••• 4242 (Instant Settlement)</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedFineForPay(null)}
                className="w-1/2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paying || Boolean(paySuccess)}
                onClick={handleExecutePayment}
                className="w-1/2 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {paying ? 'Verifying...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
