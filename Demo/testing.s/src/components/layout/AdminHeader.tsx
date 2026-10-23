'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  LogOut,
  User,
  Settings,
  Shield,
  Menu,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function AdminHeader({
  onMobileMenuToggle,
}: {
  onMobileMenuToggle: () => void;
}) {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Cmd/Ctrl + K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // refresh every 45s
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OPERATIONS_ADMIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'FINANCE_ADMIN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SUPPORT_ADMIN':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E2E8E6] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger & Search trigger */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg text-[#64706E] hover:bg-slate-100 cursor-pointer"
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 w-full max-w-sm rounded-lg border border-[#E2E8E6] bg-slate-50/70 hover:bg-slate-100 text-sm text-[#64706E] transition-colors cursor-pointer text-left"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate flex-1">Global search records...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded-md text-slate-500 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications & Admin Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="p-2 rounded-lg text-[#64706E] hover:text-[#17201F] hover:bg-slate-100 relative transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E2E8E6] overflow-hidden z-50">
                <div className="px-4 py-3 bg-slate-50 border-b border-[#E2E8E6] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#17201F]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#0F766E] hover:underline font-medium cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8E6]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#64706E]">
                      No notifications logged.
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs hover:bg-slate-50 transition-colors ${
                          !n.read ? 'bg-[#CCFBF1]/20 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#17201F]">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[#64706E] mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-[#E2E8E6] bg-slate-50 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-semibold text-[#0F766E] hover:underline inline-flex items-center gap-1"
                  >
                    View All Notifications <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#17201F] max-w-[120px] truncate">
                  {user?.name || 'Administrator'}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border w-fit ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role?.replace('_', ' ') || 'ADMIN'}
                </span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E2E8E6] overflow-hidden z-50">
                <div className="px-4 py-3 bg-slate-50 border-b border-[#E2E8E6]">
                  <p className="text-xs font-medium text-[#64706E]">Signed in as</p>
                  <p className="text-xs font-semibold text-[#17201F] truncate">{user?.email}</p>
                </div>

                <div className="p-1">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#17201F] rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    Admin Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#17201F] rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Platform Settings
                  </Link>
                  <div className="border-t border-[#E2E8E6] my-1" />
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
