'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { BookOpen, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#faf8f5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-11 h-11 rounded-2xl bg-stone-900 mx-auto flex items-center justify-center shadow-xs">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <h2 className="mt-4 text-3xl font-serif font-bold text-stone-900 tracking-tight">
          Welcome back
        </h2>
        <p className="mt-1.5 text-xs text-stone-500">
          Sign in to access your loans, waitlists, and library administration.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-stone-200/90 rounded-3xl p-8 shadow-xs">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                University Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-stone-500 hover:text-stone-900 cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick 1-Click Demo Evaluation Profiles */}
          <div className="mt-8 pt-6 border-t border-stone-100">
            <div className="flex items-center gap-1.5 text-xs text-stone-700 font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-stone-600" /> Quick 1-Click Demo Sign-in
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@example.com')}
                className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <div className="text-[11px] font-bold text-amber-900">Admin</div>
                <div className="text-[9px] text-stone-500 truncate">Super Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('librarian@example.com')}
                className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <div className="text-[11px] font-bold text-emerald-900">Librarian</div>
                <div className="text-[9px] text-stone-500 truncate">Circulation Desk</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('member@example.com')}
                className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <div className="text-[11px] font-bold text-stone-900">Member</div>
                <div className="text-[9px] text-stone-500 truncate">Active Student</div>
              </button>
            </div>
            <p className="text-[10px] text-stone-400 text-center mt-2 font-mono">Password: Password123!</p>
          </div>

          <div className="mt-6 text-center text-xs text-stone-500">
            Not enrolled yet?{' '}
            <Link href="/register" className="font-semibold text-stone-900 hover:underline">
              Register as Member
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
