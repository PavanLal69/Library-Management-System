'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  BookOpen,
  Bell,
  LogOut,
  ExternalLink,
  Search,
} from 'lucide-react';
import { CommandPalette } from './CommandPalette';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean; link?: string }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetch('/api/notifications')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data) setNotifications(data.data);
        })
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const isStaff = user?.roles.some((r) => ['SUPER_ADMIN', 'LIBRARIAN', 'ASSISTANT_LIBRARIAN'].includes(r));
  const isAdmin = user?.roles.includes('SUPER_ADMIN');

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[#faf8f5]/90 backdrop-blur-md border-b border-stone-200/90 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <BookOpen className="w-4 h-4 text-stone-100" />
                </div>
                <div>
                  <span className="text-base font-bold text-stone-900 tracking-tight block leading-tight">
                    Metropolitan LMS
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono tracking-wider uppercase">
                    Library System
                  </span>
                </div>
              </Link>

              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === '/' ? 'text-stone-950 bg-stone-200/70' : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/40'
                  }`}
                >
                  Catalog Search
                </Link>
                {user && (
                  <Link
                    href="/member"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      pathname.startsWith('/member')
                        ? 'text-stone-950 bg-stone-200/70'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/40'
                    }`}
                  >
                    Member Portal
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href="/librarian"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      pathname.startsWith('/librarian')
                        ? 'text-stone-950 bg-stone-200/70'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/40'
                    }`}
                  >
                    Circulation Desk
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'text-stone-950 bg-stone-200/70'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/40'
                    }`}
                  >
                    Admin Console
                  </Link>
                )}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Command Palette Trigger */}
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-stone-600 hover:text-stone-900 text-xs transition-colors cursor-pointer"
                title="Search catalog (Cmd+K)"
              >
                <Search className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-stone-200/80 px-1.5 py-0.5 rounded text-stone-600 border border-stone-300">
                  ⌘K
                </kbd>
              </button>

              {user ? (
                <>
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 transition-colors cursor-pointer"
                      aria-label="Notifications"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-[#faf8f5]"></span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-stone-200 shadow-xl p-4 z-50">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                          <div className="flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-stone-600" />
                            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Notifications</h4>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="text-[11px] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 my-2">
                          {notifications.length === 0 ? (
                            <p className="text-xs text-stone-400 py-6 text-center">No notifications yet.</p>
                          ) : (
                            notifications.map((n) => (
                              <div key={n.id} className={`py-3 px-1 text-xs ${!n.isRead ? 'bg-amber-50/40' : ''}`}>
                                <p className="font-semibold text-stone-900">{n.title}</p>
                                <p className="text-stone-600 mt-0.5 leading-relaxed text-[11px]">{n.message}</p>
                                {n.link && (
                                  <Link
                                    href={n.link}
                                    onClick={() => setShowNotifications(false)}
                                    className="inline-flex items-center gap-1 text-[10px] text-stone-900 font-semibold hover:underline mt-1.5"
                                  >
                                    View details <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User info & quick menu */}
                  <div className="flex items-center gap-2 bg-stone-100/90 border border-stone-200 rounded-xl px-2.5 py-1.5">
                    <div className="w-6 h-6 rounded-lg bg-stone-900 flex items-center justify-center text-[10px] font-bold text-stone-100 uppercase">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div className="hidden lg:block text-left text-xs">
                      <div className="font-medium text-stone-900 leading-tight">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {user.roles[0]?.replace('_', ' ')}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      title="Sign Out"
                      className="ml-1 text-stone-400 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition-all"
                  >
                    Join Library
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Global Command Palette */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  );
}
