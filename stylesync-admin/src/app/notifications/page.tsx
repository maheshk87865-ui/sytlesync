'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import {
  Bell,
  CheckCircle2,
  RotateCw,
  Building2,
  Star,
  CreditCard,
  HelpCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedEntity?: string;
  relatedId?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markSingleRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SALON_APPLICATION':
        return <Building2 className="w-5 h-5 text-emerald-600" />;
      case 'REVIEW_REPORT':
        return <Star className="w-5 h-5 text-amber-600" />;
      case 'PAYMENT_ISSUE':
        return <CreditCard className="w-5 h-5 text-rose-600" />;
      case 'SUPPORT_TICKET':
        return <HelpCircle className="w-5 h-5 text-sky-600" />;
      case 'SECURITY_ALERT':
        return <ShieldAlert className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-[#0F766E]" />;
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Notifications' }]}
      title="Platform Notifications Center"
      description="Live administrative event stream for salon applications, reviews, financial flags, and security alerts."
      actions={
        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0F766E] bg-[#CCFBF1] hover:bg-[#99F6E4] transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark All as Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Notifications"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-[#E2E8E6] flex items-center justify-between text-xs font-semibold text-[#17201F]">
          <span>Logged Operational Alerts ({notifications.length})</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px]">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="divide-y divide-[#E2E8E6]">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
              Loading notification records...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No administrative notifications currently recorded.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                  !n.read ? 'bg-[#CCFBF1]/15' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#17201F]">{n.title}</span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#64706E] mt-1">{n.message}</p>
                    <div className="text-[10px] text-slate-400 mt-2">
                      {new Date(n.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markSingleRead(n.id)}
                      className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] text-xs font-medium text-[#0F766E] hover:bg-[#CCFBF1]/40 transition-colors cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                  {n.relatedEntity === 'Salon' && (
                    <Link
                      href="/salons?applicationStatus=PENDING"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-slate-100 transition-colors"
                      title="Inspect Salon"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  {n.relatedEntity === 'Review' && (
                    <Link
                      href="/reviews?reportStatus=REPORTED"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-slate-100 transition-colors"
                      title="Inspect Review"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  {n.relatedEntity === 'SupportTicket' && (
                    <Link
                      href="/support"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-slate-100 transition-colors"
                      title="Open Support"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  {n.relatedEntity === 'Refund' && (
                    <Link
                      href="/payments"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-slate-100 transition-colors"
                      title="Inspect Payments"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
