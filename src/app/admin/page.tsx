'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  ShieldAlert,
  Sliders,
  FileText,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function AdminConsolePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'audit'>('analytics');
  const [stats, setStats] = useState<any | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings update state
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.roles.includes('SUPER_ADMIN'))) {
      router.push('/login');
      return;
    }

    if (user && user.roles.includes('SUPER_ADMIN')) {
      loadAdminData();
    }
  }, [user, authLoading, router]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, settingsRes, auditRes] = await Promise.all([
        fetch('/api/analytics/circulation'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/audit?limit=40'),
      ]);

      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        setStats(d.data);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setSettings(d.data || {});
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save settings');
      }

      setSettingsSuccess('Library operational policies successfully updated.');
      loadAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 w-full animate-pulse space-y-6 bg-[#faf8f5]">
        <div className="h-28 bg-stone-200 rounded-3xl"></div>
        <div className="h-96 bg-stone-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 bg-[#faf8f5]">
      {/* Admin Header */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-stone-900">System Administration Console</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Executive circulation analytics, system-wide policy parameters, and append-only cryptographic audit logs.
              </p>
            </div>
          </div>

          <button
            onClick={loadAdminData}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-700" /> Refresh Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'analytics'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Executive Analytics
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Policy & Settings
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: EXECUTIVE ANALYTICS */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Enrolled Members</span>
              <div className="mt-2 text-2xl font-serif font-bold text-stone-900">{stats.metrics.totalMembers}</div>
            </div>
            <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Catalog Titles</span>
              <div className="mt-2 text-2xl font-serif font-bold text-stone-900">{stats.metrics.catalogSize}</div>
            </div>
            <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
              <span className="text-xs font-semibold text-emerald-800">Fines Collected</span>
              <div className="mt-2 text-2xl font-serif font-bold text-emerald-800">${stats.metrics.totalFinesCollected.toFixed(2)}</div>
            </div>
            <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
              <span className="text-xs font-semibold text-rose-800">Outstanding Fines</span>
              <div className="mt-2 text-2xl font-serif font-bold text-rose-800">${stats.metrics.outstandingFines.toFixed(2)}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Circulation Area Chart */}
            <div className="rounded-3xl bg-white border border-stone-200 p-6 shadow-xs">
              <div className="mb-4">
                <h3 className="text-sm font-serif font-bold text-stone-900">Daily Circulation Trends (Last 14 Days)</h3>
                <p className="text-xs text-stone-500">Issued checkouts vs return volume reconciliations.</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyCirculation}>
                    <defs>
                      <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#292524" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#292524" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                    <XAxis dataKey="date" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '12px', fontSize: '12px', color: '#1c1917', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="issued" name="Books Issued" stroke="#292524" strokeWidth={2} fillOpacity={1} fill="url(#colorIssued)" />
                    <Area type="monotone" dataKey="returned" name="Books Returned" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorReturned)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Most Borrowed Books Bar Chart */}
            <div className="rounded-3xl bg-white border border-stone-200 p-6 shadow-xs">
              <div className="mb-4">
                <h3 className="text-sm font-serif font-bold text-stone-900">Most Borrowed Titles</h3>
                <p className="text-xs text-stone-500">Top titles by total checkout frequency.</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.mostBorrowed}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                    <XAxis dataKey="title" stroke="#78716c" fontSize={10} tickFormatter={(t) => t.slice(0, 14) + '...'} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '12px', fontSize: '12px', color: '#1c1917', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    />
                    <Bar dataKey="count" name="Circulation Count" fill="#78716c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SETTINGS & POLICIES */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-serif font-bold text-stone-900 mb-2">Configure Library Rules & Constraints</h3>
          <p className="text-xs text-stone-500 mb-6">
            Policies defined here govern loan issuance, maximum renewal limits, daily overdue penalties, and pickup holding windows.
          </p>

          {settingsSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Standard Loan Period (Days)</label>
              <input
                type="number"
                value={settings.LOAN_PERIOD_DAYS || '14'}
                onChange={(e) => setSettings({ ...settings, LOAN_PERIOD_DAYS: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Maximum Allowed Renewals</label>
              <input
                type="number"
                value={settings.MAX_RENEWALS || '2'}
                onChange={(e) => setSettings({ ...settings, MAX_RENEWALS: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Daily Overdue Fine Rate ($)</label>
                <input
                  type="text"
                  value={settings.DAILY_FINE_RATE || '0.50'}
                  onChange={(e) => setSettings({ ...settings, DAILY_FINE_RATE: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Max Accumulated Fine Cap ($)</label>
                <input
                  type="text"
                  value={settings.MAX_OVERDUE_FINE || '25.00'}
                  onChange={(e) => setSettings({ ...settings, MAX_OVERDUE_FINE: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Overdue Grace Period (Days)</label>
                <input
                  type="number"
                  value={settings.GRACE_PERIOD_DAYS || '1'}
                  onChange={(e) => setSettings({ ...settings, GRACE_PERIOD_DAYS: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Reservation Hold Window (Hours)</label>
                <input
                  type="number"
                  value={settings.RESERVATION_PICKUP_HOURS || '48'}
                  onChange={(e) => setSettings({ ...settings, RESERVATION_PICKUP_HOURS: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {savingSettings ? 'Saving...' : 'Save Configuration Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: AUDIT LOG VIEWER */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-serif font-bold text-stone-900">Immutable Append-Only Audit Stream</h3>
              <p className="text-xs text-stone-500">All sensitive library operations are recorded with cryptographic timestamps.</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
              {auditLogs.length} Events Captured
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="pb-3 pl-2">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Entity Type</th>
                  <th className="pb-3 pr-2">Metadata Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 pl-2 text-stone-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()} • {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-semibold text-stone-900">{log.action}</td>
                    <td className="py-3 text-stone-600">{log.actorRole || 'SYSTEM'}</td>
                    <td className="py-3 text-stone-500">{log.entityType}</td>
                    <td className="py-3 pr-2 text-stone-500 max-w-xs truncate" title={log.metadata}>
                      {log.metadata || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
