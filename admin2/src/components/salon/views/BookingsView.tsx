'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState } from '../ui';
import { Avatar, StatusBadge, formatCurrency, formatDate, formatTime, todayStr } from '../shared';
import { AddBookingDialog } from '../dialogs/AddBookingDialog';
import { BookingDetailsDialog } from '../dialogs/BookingDetailsDialog';
import {
  CalendarDays, Search, Plus, Filter, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

type FilterTab = 'ALL' | 'PENDING' | 'UPCOMING' | 'TODAY' | 'COMPLETED' | 'CANCELLED';
const TABS: FilterTab[] = ['ALL', 'PENDING', 'UPCOMING', 'TODAY', 'COMPLETED', 'CANCELLED'];

export function BookingsView() {
  const bookings = useSalonStore(s => s.bookings);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const selectedBookingId = useSalonStore(s => s.selectedBookingId);
  const bookingFilter = useSalonStore(s => s.bookingFilter);
  const setBookingFilter = useSalonStore(s => s.setBookingFilter);

  const [showFilters, setShowFilters] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // The details dialog auto-opens whenever a booking is selected in the store,
  // regardless of which view initiated the selection (Dashboard, Calendar, etc.)
  const detailsOpen = !!selectedBookingId;
  const closeDetails = () => selectBooking(null);

  const today = todayStr();

  // The dashboard card passes BOTH dateFilter=TODAY and statusFilter=<status>.
  // Tab clicks set the tab AND sync status/date filter so they always stay consistent.
  const handleTabChange = (tab: FilterTab) => {
    if (tab === 'TODAY') {
      setBookingFilter({ tab, dateFilter: 'TODAY', statusFilter: 'ALL' });
    } else if (tab === 'ALL') {
      setBookingFilter({ tab, dateFilter: 'ALL', statusFilter: 'ALL' });
    } else {
      // PENDING / UPCOMING / COMPLETED / CANCELLED
      setBookingFilter({ tab, statusFilter: tab, dateFilter: 'ALL' });
    }
  };

  // Single source of truth: every visible filter combines together.
  // Filter precedence: date filter (TODAY/PAST/FUTURE) is always respected,
  // then status filter, then service, then staff, then search.
  const filtered = useMemo(() => {
    let list = [...bookings];

    // Apply date filter
    if (bookingFilter.dateFilter === 'TODAY') {
      list = list.filter(b => b.date === today);
    } else if (bookingFilter.dateFilter === 'PAST') {
      list = list.filter(b => b.date < today);
    } else if (bookingFilter.dateFilter === 'FUTURE') {
      list = list.filter(b => b.date > today);
    }

    // Apply status filter
    if (bookingFilter.statusFilter !== 'ALL') {
      list = list.filter(b => b.status === bookingFilter.statusFilter);
    }

    // Apply service filter
    if (bookingFilter.serviceFilter !== 'ALL') {
      list = list.filter(b => b.serviceId === bookingFilter.serviceFilter);
    }

    // Apply staff filter
    if (bookingFilter.staffFilter !== 'ALL') {
      list = list.filter(b => b.staffId === bookingFilter.staffFilter);
    }

    // Apply search (WITHIN the already-filtered set)
    if (bookingFilter.search.trim()) {
      const q = bookingFilter.search.toLowerCase();
      list = list.filter(b =>
        b.id.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b.staffName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q)
      );
    }

    return list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [bookings, bookingFilter, today]);

  const openBooking = (id: string) => {
    selectBooking(id);
    // detailsOpen is now derived from selectedBookingId, so the dialog opens automatically
  };

  // Tab counts — also calculated from the shared dataset
  const counts = useMemo(() => ({
    ALL: bookings.length,
    PENDING: bookings.filter(b => b.status === 'PENDING').length,
    UPCOMING: bookings.filter(b => b.status === 'UPCOMING').length,
    TODAY: bookings.filter(b => b.date === today).length,
    COMPLETED: bookings.filter(b => b.status === 'COMPLETED').length,
    CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
  }), [bookings, today]);

  // Build the active filter chips for display
  const activeChips: { label: string; onClear: () => void }[] = [];
  if (bookingFilter.dateFilter === 'TODAY') {
    activeChips.push({ label: 'Today', onClear: () => setBookingFilter({ dateFilter: 'ALL', tab: 'ALL' }) });
  } else if (bookingFilter.dateFilter === 'PAST') {
    activeChips.push({ label: 'Past', onClear: () => setBookingFilter({ dateFilter: 'ALL' }) });
  } else if (bookingFilter.dateFilter === 'FUTURE') {
    activeChips.push({ label: 'Future', onClear: () => setBookingFilter({ dateFilter: 'ALL' }) });
  }
  if (bookingFilter.statusFilter !== 'ALL') {
    const statusLabel = bookingFilter.statusFilter.charAt(0) + bookingFilter.statusFilter.slice(1).toLowerCase();
    activeChips.push({ label: statusLabel, onClear: () => setBookingFilter({ statusFilter: 'ALL', tab: 'ALL' }) });
  }
  if (bookingFilter.staffFilter !== 'ALL') {
    const staffMember = staff.find(s => s.id === bookingFilter.staffFilter);
    if (staffMember) activeChips.push({ label: staffMember.name, onClear: () => setBookingFilter({ staffFilter: 'ALL' }) });
  }
  if (bookingFilter.serviceFilter !== 'ALL') {
    const service = services.find(s => s.id === bookingFilter.serviceFilter);
    if (service) activeChips.push({ label: service.name, onClear: () => setBookingFilter({ serviceFilter: 'ALL' }) });
  }
  if (bookingFilter.search.trim()) {
    activeChips.push({ label: `"${bookingFilter.search}"`, onClear: () => setBookingFilter({ search: '' }) });
  }

  // Build the heading subtitle dynamically based on filter combination
  const buildSubtitle = () => {
    const parts: string[] = [];
    if (bookingFilter.dateFilter === 'TODAY') parts.push("today");
    else if (bookingFilter.dateFilter === 'PAST') parts.push("past");
    else if (bookingFilter.dateFilter === 'FUTURE') parts.push("future");

    let prefix = '';
    if (bookingFilter.statusFilter !== 'ALL') {
      prefix = bookingFilter.statusFilter.charAt(0) + bookingFilter.statusFilter.slice(1).toLowerCase() + ' ';
    }
    const count = filtered.length;
    if (count === 0) {
      return `No ${prefix.toLowerCase() || ''}bookings ${parts[0] || 'found'}`.trim();
    }
    return `${count} ${prefix}booking${count !== 1 ? 's' : ''} ${parts[0] || ''}`.trim();
  };

  // Empty state message per filter combination
  const getEmptyMessage = () => {
    if (bookingFilter.search.trim()) return 'No bookings match your search. Try a different keyword.';
    if (bookingFilter.dateFilter === 'TODAY' && bookingFilter.statusFilter !== 'ALL') {
      const statusLabel = bookingFilter.statusFilter.charAt(0) + bookingFilter.statusFilter.slice(1).toLowerCase();
      return `No ${statusLabel.toLowerCase()} bookings today.`;
    }
    if (bookingFilter.dateFilter === 'TODAY') return 'No bookings scheduled for today.';
    if (bookingFilter.dateFilter === 'PAST') return 'No past bookings to show.';
    if (bookingFilter.dateFilter === 'FUTURE') return 'No future bookings scheduled.';
    if (bookingFilter.statusFilter !== 'ALL') {
      const statusLabel = bookingFilter.statusFilter.charAt(0) + bookingFilter.statusFilter.slice(1).toLowerCase();
      return `No ${statusLabel.toLowerCase()} bookings found.`;
    }
    return 'No bookings found. Try adjusting filters or add a new booking.';
  };

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={buildSubtitle()}
        action={
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Booking
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              'px-3.5 py-1.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors border',
              bookingFilter.tab === tab ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted text-foreground'
            )}
          >
            {tab === 'TODAY' ? 'Today' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            <span className={cn('ml-1.5 text-xs', bookingFilter.tab === tab ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Showing:</span>
          {activeChips.map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/40 text-xs font-medium border border-accent">
              {chip.label}
              <button onClick={chip.onClear} className="hover:text-status-cancelled transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {activeChips.length > 1 && (
            <button
              onClick={() => setBookingFilter({ dateFilter: 'ALL', statusFilter: 'ALL', staffFilter: 'ALL', serviceFilter: 'ALL', search: '', tab: 'ALL' })}
              className="text-xs text-status-cancelled hover:underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search + filters toggle */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search within filtered bookings..."
            value={bookingFilter.search}
            onChange={(e) => setBookingFilter({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(s => !s)}>
          <Filter className="w-4 h-4 mr-1.5" /> Filters
          {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-xl bg-muted/30 border border-border">
          <Select value={bookingFilter.dateFilter} onValueChange={(v) => setBookingFilter({ dateFilter: v as any, tab: v === 'TODAY' ? 'TODAY' : 'ALL' })}>
            <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All dates</SelectItem>
              <SelectItem value="TODAY">Today only</SelectItem>
              <SelectItem value="PAST">Past bookings</SelectItem>
              <SelectItem value="FUTURE">Future bookings</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bookingFilter.serviceFilter} onValueChange={(v) => setBookingFilter({ serviceFilter: v })}>
            <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All services</SelectItem>
              {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bookingFilter.staffFilter} onValueChange={(v) => setBookingFilter({ staffFilter: v })}>
            <SelectTrigger><SelectValue placeholder="Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All staff</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bookingFilter.statusFilter} onValueChange={(v) => setBookingFilter({ statusFilter: v as any, tab: v === 'ALL' ? 'ALL' : (v as any) })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Live counter */}
      <div className="mb-3 text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> booking{filtered.length !== 1 ? 's' : ''}
        {bookingFilter.dateFilter === 'TODAY' && ' today'}
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings to show"
          subtitle={getEmptyMessage()}
          action={<Button onClick={() => setAddOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Booking</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(b => (
            <button
              key={b.id}
              onClick={() => openBooking(b.id)}
              className="w-full flex items-center gap-3.5 p-3.5 md:p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#087F68]/50 hover:shadow-card transition-all text-left group"
            >
              {/* Date/time block */}
              <div className="text-center shrink-0 min-w-[64px] py-1 px-1.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                <p className="font-bold text-sm text-[#1F2937]">{formatTime(b.startTime)}</p>
                <p className="text-[11px] text-[#6B7280] font-medium uppercase tracking-wider">{formatDate(b.date).split(' ').slice(0, 2).join(' ')}</p>
              </div>

              {/* Customer avatar with primary green background */}
              <Avatar
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(b.customerName)}&background=087F68&color=fff`}
                alt={b.customerName}
                size={42}
                className="ring-1 ring-[#E5E7EB]"
              />

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm text-[#1F2937] truncate group-hover:text-[#087F68] transition-colors">{b.customerName}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-xs text-[#6B7280] truncate flex items-center gap-1.5">
                  <span className="font-medium text-[#1F2937]">{b.serviceName}</span>
                  <span>·</span>
                  <span>{b.staffName}</span>
                  <span>·</span>
                  <span>{b.duration}min</span>
                </p>
              </div>

              {/* Price + ID aligned cleanly on the right */}
              <div className="text-right shrink-0 hidden sm:block pl-2 border-l border-[#E5E7EB]">
                <p className="font-bold text-sm text-[#1F2937]">{formatCurrency(b.price)}</p>
                <p className="text-[11px] text-[#6B7280] font-mono">#{b.id.slice(-6)}</p>
              </div>
              <div className="text-right shrink-0 sm:hidden">
                <p className="font-bold text-sm text-[#1F2937]">{formatCurrency(b.price)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddBookingDialog open={addOpen} onOpenChange={setAddOpen} />
      <BookingDetailsDialog bookingId={selectedBookingId} open={detailsOpen} onOpenChange={(o) => { if (!o) closeDetails(); }} />
    </div>
  );
}
