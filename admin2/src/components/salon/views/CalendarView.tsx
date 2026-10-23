'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader } from '../ui';
import { StatusBadge, formatTime, formatCurrency, todayStr } from '../shared';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BookingDetailsDialog } from '../dialogs/BookingDetailsDialog';
import type { Booking } from '@/lib/types';

type ViewMode = 'MONTH' | 'WEEK' | 'DAY';

export function CalendarView() {
  const bookings = useSalonStore(s => s.bookings);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const selectedBookingId = useSalonStore(s => s.selectedBookingId);
  const setView = useSalonStore(s => s.setView);
  const selectDate = useSalonStore(s => s.selectDate);
  const selectedDate = useSalonStore(s => s.selectedDate);

  const [mode, setMode] = useState<ViewMode>('MONTH');
  const [anchor, setAnchor] = useState(new Date()); // current month/week anchor
  const [detailsOpen, setDetailsOpen] = useState(false);

  const today = todayStr();

  const bookingsForDate = (dateStr: string) =>
    bookings.filter(b => b.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const statusColor = (status: string) => {
    if (status === 'COMPLETED') return 'bg-status-completed';
    if (status === 'CANCELLED') return 'bg-status-cancelled';
    if (status === 'UPCOMING') return 'bg-status-upcoming';
    return 'bg-status-pending';
  };

  const openBooking = (id: string) => {
    selectBooking(id);
    setDetailsOpen(true);
  };

  // Navigation helpers
  const prev = () => {
    const d = new Date(anchor);
    if (mode === 'MONTH') d.setMonth(d.getMonth() - 1);
    else if (mode === 'WEEK') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setAnchor(d);
  };
  const next = () => {
    const d = new Date(anchor);
    if (mode === 'MONTH') d.setMonth(d.getMonth() + 1);
    else if (mode === 'WEEK') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setAnchor(d);
  };
  const goToday = () => {
    setAnchor(new Date());
    selectDate(today);
  };

  // Month grid
  const monthDays = useMemo(() => {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const days: { date: string | null; inMonth: boolean }[] = [];
    // Previous month tail
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.toISOString().split('T')[0], inMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d).toISOString().split('T')[0], inMonth: true });
    }
    // Next month head to fill 42 cells
    while (days.length < 42) {
      const lastDate = days[days.length - 1].date;
      const d = new Date(lastDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      days.push({ date: d.toISOString().split('T')[0], inMonth: false });
    }
    return days;
  }, [anchor, mode]);

  // Week days
  const weekDays = useMemo(() => {
    const start = new Date(anchor);
    start.setDate(start.getDate() - start.getDay());
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [anchor]);

  const dayLabel = useMemo(() => {
    if (mode === 'MONTH') {
      return anchor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    if (mode === 'WEEK') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${new Date(start + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return new Date(anchor.toISOString().split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [anchor, mode, weekDays]);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="View past, present, and future appointments"
        action={
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
            {(['MONTH', 'WEEK', 'DAY'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground'
                )}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        }
      />

      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
          <h2 className="font-semibold text-base md:text-lg ml-1">{dayLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button size="sm" onClick={() => { setView('availability'); }}>Manage Slots</Button>
        </div>
      </div>

      {/* Month view */}
      {mode === 'MONTH' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-2.5 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, idx) => {
              if (!day.date) return <div key={idx} className="cal-cell border-r border-b border-border" />;
              const dayBookings = bookingsForDate(day.date);
              const isToday = day.date === today;
              const isSelected = day.date === selectedDate;
              return (
                <button
                  key={idx}
                  onClick={() => { if (day.date) { selectDate(day.date); setMode('DAY'); setAnchor(new Date(day.date + 'T00:00:00')); } }}
                  className={cn(
                    'cal-cell border-r border-b border-border p-1.5 text-left hover:bg-muted/40 transition-colors min-h-[88px] flex flex-col gap-1',
                    !day.inMonth && 'bg-muted/20',
                    isSelected && 'bg-accent/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    )}>
                      {new Date(day.date + 'T00:00:00').getDate()}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayBookings.length}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayBookings.slice(0, 3).map(b => (
                      <div key={b.id} className={cn('flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate', statusColor(b.status))}>
                        <span className="opacity-90 hidden sm:inline">{b.startTime}</span>
                        <span className="truncate flex-1 text-foreground">{b.customerName}</span>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <p className="text-[10px] text-muted-foreground px-1">+{dayBookings.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {mode === 'WEEK' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map(dateStr => {
            const dayBookings = bookingsForDate(dateStr);
            const isToday = dateStr === today;
            return (
              <div key={dateStr} className={cn('rounded-2xl border bg-card overflow-hidden', isToday && 'border-primary')}>
                <div className={cn('p-3 border-b border-border', isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/30')}>
                  <p className="text-xs font-semibold">{new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                  <p className="text-lg font-bold">{new Date(dateStr + 'T00:00:00').getDate()}</p>
                </div>
                <div className="p-2 space-y-1.5 min-h-[200px]">
                  {dayBookings.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No bookings</p>
                  ) : dayBookings.map(b => (
                    <button
                      key={b.id}
                      onClick={() => openBooking(b.id)}
                      className={cn('w-full text-left p-2 rounded-lg border hover:shadow-sm transition-all',
                        b.status === 'COMPLETED' ? 'border-status-completed/40 bg-status-completed/10' :
                        b.status === 'CANCELLED' ? 'border-status-cancelled/40 bg-status-cancelled/10' :
                        b.status === 'UPCOMING' ? 'border-status-upcoming/40 bg-status-upcoming/10' :
                        'border-status-pending/40 bg-status-pending/10'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold">{formatTime(b.startTime)}</p>
                        <StatusBadge status={b.status} className="text-[10px] px-1.5 py-0.5" />
                      </div>
                      <p className="text-xs font-medium truncate">{b.customerName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{b.serviceName}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day view */}
      {mode === 'DAY' && (
        <DayView date={mode === 'DAY' ? anchor.toISOString().split('T')[0] : today} />
      )}

      <BookingDetailsDialog bookingId={selectedBookingId} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}

function DayView({ date }: { date: string }) {
  const bookings = useSalonStore(s => s.bookings);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setView = useSalonStore(s => s.setView);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dayBookings = bookings.filter(b => b.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const completedRevenue = dayBookings.filter(b => b.status === 'COMPLETED' && b.paymentStatus === 'PAID').reduce((s, b) => s + b.price, 0);

  const openBooking = (id: string) => { selectBooking(id); setDetailsOpen(true); };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Bookings</p>
          <p className="text-lg font-bold">{dayBookings.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-lg font-bold">{dayBookings.filter(b => b.status === 'COMPLETED').length}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-lg font-bold">{formatCurrency(completedRevenue)}</p>
        </div>
      </div>

      {dayBookings.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No appointments on this date.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setView('availability')}>Manage Slots</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayBookings.map(b => (
            <button
              key={b.id}
              onClick={() => openBooking(b.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left"
            >
              <div className="text-center shrink-0 min-w-[64px]">
                <p className="font-semibold text-sm">{formatTime(b.startTime)}</p>
                <p className="text-xs text-muted-foreground">{b.duration}min</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{b.customerName}</p>
                  <StatusBadge status={b.status} className="text-[10px] px-1.5 py-0.5" />
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{b.serviceName} · {b.staffName}</p>
              </div>
              <p className="text-sm font-semibold shrink-0">{formatCurrency(b.price)}</p>
            </button>
          ))}
        </div>
      )}
      <BookingDetailsDialog bookingId={useSalonStore.getState().selectedBookingId} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}
