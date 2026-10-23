'use client';
import { useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { calculateRevenue } from '@/lib/revenue';
import { PageHeader, StatCard } from '../ui';
import { Avatar, StatusBadge, SafeImage, formatCurrency, formatDate, formatTime, todayStr } from '../shared';
import {
  CalendarDays, Clock, CheckCircle2, Wallet, XCircle, Calendar,
  Plus, Scissors, UserRound, CalendarRange, BarChart3, ChevronRight,
  MapPin, Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const salon = useSalonStore(s => s.salon);
  const bookings = useSalonStore(s => s.bookings);
  const payments = useSalonStore(s => s.payments);
  const setView = useSalonStore(s => s.setView);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setSalonStatus = useSalonStore(s => s.setSalonStatus);
  const setBookingFilter = useSalonStore(s => s.setBookingFilter);
  const resetBookingFilter = useSalonStore(s => s.resetBookingFilter);
  const setPaymentFilter = useSalonStore(s => s.setPaymentFilter);

  const today = todayStr();
  const todaysBookings = useMemo(() =>
    bookings.filter(b => b.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, today]);

  // Live counts calculated from the shared booking dataset (today only)
  const upcomingToday = todaysBookings.filter(b => b.status === 'UPCOMING').length;
  const completedToday = todaysBookings.filter(b => b.status === 'COMPLETED').length;
  const cancelledToday = todaysBookings.filter(b => b.status === 'CANCELLED').length;
  // Today's Revenue is calculated from the shared payments[] array (single source of truth)
  // — same calculation the Payments view uses, so the two always match.
  const todaysRevenue = useMemo(
    () => calculateRevenue(payments, 'TODAY', today),
    [payments, today]
  );

  // Card click handlers — set BOTH date filter AND status filter so the Bookings page
  // shows the exact same records the card counted (TODAY + STATUS)
  const goToBookingsToday = () => {
    setBookingFilter({ tab: 'TODAY', dateFilter: 'TODAY', statusFilter: 'ALL' });
    setView('bookings');
  };
  const goToBookingsTodayUpcoming = () => {
    setBookingFilter({ tab: 'TODAY', dateFilter: 'TODAY', statusFilter: 'UPCOMING' });
    setView('bookings');
  };
  const goToBookingsTodayCompleted = () => {
    setBookingFilter({ tab: 'TODAY', dateFilter: 'TODAY', statusFilter: 'COMPLETED' });
    setView('bookings');
  };
  const goToBookingsTodayCancelled = () => {
    setBookingFilter({ tab: 'TODAY', dateFilter: 'TODAY', statusFilter: 'CANCELLED' });
    setView('bookings');
  };
  const goToPayments = () => {
    setPaymentFilter({ range: 'TODAY', statusFilter: 'ALL', search: '' });
    setView('payments');
  };
  const goToAvailability = () => setView('availability');

  const quickActions = [
    { label: 'Add Booking', icon: CalendarDays, view: 'bookings' as const, action: () => { resetBookingFilter(); setView('bookings'); } },
    { label: 'Add Service', icon: Scissors, view: 'services' as const, action: () => setView('services') },
    { label: 'Add Staff', icon: UserRound, view: 'staff' as const, action: () => setView('staff') },
    { label: 'Manage Availability', icon: Calendar, view: 'availability' as const, action: () => setView('availability') },
    { label: 'View Calendar', icon: CalendarRange, view: 'calendar' as const, action: () => setView('calendar') },
    { label: 'View Analytics', icon: BarChart3, view: 'analytics' as const, action: () => setView('analytics') },
  ];

  return (
    <div>
      {/* Salon header card — white surface with subtle light-gray #E5E7EB border */}
      <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden mb-5 bg-white shadow-card">
        {/* Salon cover image */}
        <div className="h-40 md:h-56 relative bg-[#F3F4F6]">
          <SafeImage
            src={salon.coverImage}
            alt={salon.name}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full"
            rounded="none"
            showTextInFallback={false}
          />
        </div>

        {/* Salon info row — white background */}
        <div className="p-4 md:p-5 bg-white">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            {/* Salon logo */}
            <SafeImage
              src={salon.logo}
              alt={salon.name}
              className="w-14 h-14 md:w-16 md:h-16 object-cover shadow-xs shrink-0 border border-[#E5E7EB]"
              fallbackClassName="w-14 h-14 md:w-16 md:h-16 shadow-xs shrink-0 flex items-center justify-center bg-[#E6F4F1] text-[#087F68]"
              rounded="2xl"
            />
            {/* Salon name + location + Open status badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold text-[#1F2937] truncate">{salon.name}</h2>
                <StatusBadge status={salon.status} />
              </div>
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-[#6B7280] mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#087F68]" />
                <span className="truncate">{salon.area}, {salon.city}</span>
              </div>
            </div>
            {/* Open / Closed toggle */}
            <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-1">
              <button
                onClick={() => setSalonStatus('OPEN')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  salon.status === 'OPEN' ? 'bg-[#087F68] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#1F2937]'
                )}
              >
                Open
              </button>
              <button
                onClick={() => setSalonStatus('CLOSED')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  salon.status === 'CLOSED' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#1F2937]'
                )}
              >
                Closed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric cards - 3x2 grid with white surfaces */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-5">
        <StatCard label="Bookings" value={String(todaysBookings.length)} sub="today" icon={CalendarDays}
          onClick={goToBookingsToday} variant="emerald" />
        <StatCard label="Upcoming" value={String(upcomingToday)} sub="today" icon={Clock}
          onClick={goToBookingsTodayUpcoming} trend={upcomingToday > 0 ? 'up' : 'neutral'} variant="sky" />
        <StatCard label="Completed" value={String(completedToday)} sub="today" icon={CheckCircle2}
          onClick={goToBookingsTodayCompleted} trend={completedToday > 0 ? 'up' : 'neutral'} variant="green" />
        <StatCard label="Today's Revenue" value={formatCurrency(todaysRevenue)} sub="completed bookings"
          icon={Wallet} onClick={goToPayments} trend="up" variant="teal" />
        <StatCard label="Cancelled" value={String(cancelledToday)} sub="today" icon={XCircle}
          onClick={goToBookingsTodayCancelled} trend={cancelledToday > 0 ? 'down' : 'neutral'} variant="red" />
        <StatCard label="Manage Availability" value="Manage" sub="time slots & breaks" icon={Calendar}
          onClick={goToAvailability} variant="lavender" />
      </div>

      {/* Today's appointments — white container */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white mb-5 overflow-hidden shadow-card">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[#E5E7EB]">
          <div>
            <h3 className="font-semibold text-base text-[#1F2937]">Today&apos;s Appointments</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">{todaysBookings.length} bookings · {formatDate(todayStr())}</p>
          </div>
          <button onClick={() => goToBookingsToday()} className="text-xs font-semibold text-[#087F68] hover:text-[#066653] hover:underline">
            View all
          </button>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {todaysBookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B7280]">No appointments today</div>
          ) : todaysBookings.map(b => (
            <button
              key={b.id}
              onClick={() => {
                setBookingFilter({ tab: 'TODAY', dateFilter: 'TODAY', statusFilter: 'ALL' });
                selectBooking(b.id);
                setView('bookings');
              }}
              className="w-full flex items-center gap-3 md:gap-4 p-4 hover:bg-[#F9FAFB] transition-colors text-left group"
            >
              <div className="text-center shrink-0 min-w-[58px] py-1 px-1.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                <p className="font-bold text-sm text-[#1F2937]">{formatTime(b.startTime)}</p>
                <p className="text-[11px] text-[#6B7280]">{b.duration} min</p>
              </div>
              <Avatar src={bookings.find(x => x.id === b.id) ? `https://ui-avatars.com/api/?name=${encodeURIComponent(b.customerName)}&background=087F68&color=fff` : ''} alt={b.customerName} size={40} className="ring-1 ring-[#E5E7EB]" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate text-[#1F2937] group-hover:text-[#087F68] transition-colors">{b.customerName}</p>
                <p className="text-xs text-[#6B7280] truncate">{b.serviceName} · {b.staffName}</p>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <p className="font-bold text-sm text-[#1F2937]">{formatCurrency(b.price)}</p>
                <p className="text-[11px] text-[#6B7280] font-mono">#{b.id.slice(-6)}</p>
              </div>
              <StatusBadge status={b.status} />
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-semibold text-base mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={a.action}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-card transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
