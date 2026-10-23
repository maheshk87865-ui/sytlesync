'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState } from '../ui';
import { formatTime } from '../shared';
import { Button } from '@/components/ui/button';
import {
  Bell, CalendarDays, Star, CheckCircle2, XCircle, Clock, Wallet, Store, Check, CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const ICON_MAP: Record<Notification['type'], React.ComponentType<{ className?: string }>> = {
  new_booking: CalendarDays,
  booking_cancelled: XCircle,
  upcoming_appointment: Clock,
  new_review: Star,
  payment_received: Wallet,
  profile_attention: Store,
};

const COLOR_MAP: Record<Notification['type'], string> = {
  new_booking: 'bg-status-booked/15 text-status-booked',
  booking_cancelled: 'bg-status-cancelled/15 text-status-cancelled',
  upcoming_appointment: 'bg-status-pending/15 text-status-pending',
  new_review: 'bg-status-completed/15 text-status-completed',
  payment_received: 'bg-status-completed/15 text-status-completed',
  profile_attention: 'bg-status-upcoming/15 text-status-upcoming',
};

export function NotificationsView() {
  const notifications = useSalonStore(s => s.notifications);
  const markNotificationRead = useSalonStore(s => s.markNotificationRead);
  const markAllNotificationsRead = useSalonStore(s => s.markAllNotificationsRead);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setView = useSalonStore(s => s.setView);

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const filtered = useMemo(() => {
    const list = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filter === 'UNREAD' ? list.filter(n => !n.read) : list;
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpen = (n: Notification) => {
    markNotificationRead(n.id);
    if (n.linkType === 'booking' && n.linkId) {
      selectBooking(n.linkId);
      setView('bookings');
    } else if (n.linkType === 'review') {
      setView('reviews');
    } else if (n.linkType === 'payment') {
      setView('payments');
    } else if (n.linkType === 'profile') {
      setView('profile');
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        action={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" onClick={markAllNotificationsRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-1.5 mb-4">
        {(['ALL', 'UNREAD'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3.5 py-1.5 text-sm font-semibold rounded-xl border transition-colors',
              filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
            )}
          >
            {f === 'ALL' ? 'All' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" subtitle="New notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const Icon = ICON_MAP[n.type];
            const dateObj = new Date(n.createdAt);
            const timeAgo = formatTimeAgo(n.createdAt);
            return (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={cn(
                  'w-full flex items-start gap-3 p-3.5 rounded-2xl border bg-card hover:shadow-sm transition-all text-left',
                  n.read ? 'border-border' : 'border-primary/40 bg-accent/20'
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', COLOR_MAP[n.type])}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-semibold', !n.read && 'text-primary')}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>{timeAgo}</p>
                </div>
                {n.read && <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
