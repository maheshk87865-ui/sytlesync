'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState, BackButton } from '../ui';
import { Avatar, StatusBadge, formatCurrency, formatDate, formatTime, todayStr } from '../shared';
import { Stars } from '../shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Users, Search, TrendingUp, Crown, Clock, Calendar as CalIcon, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CustomersView() {
  const customers = useSalonStore(s => s.customers);
  const bookings = useSalonStore(s => s.bookings);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const reviews = useSalonStore(s => s.reviews);
  const selectCustomer = useSalonStore(s => s.selectCustomer);
  const selectedCustomerId = useSalonStore(s => s.selectedCustomerId);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'spent' | 'bookings' | 'name'>('recent');

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sort === 'spent') return b.totalSpent - a.totalSpent;
      if (sort === 'bookings') return b.totalBookings - a.totalBookings;
      if (sort === 'name') return a.name.localeCompare(b.name);
      return (b.lastVisit || '').localeCompare(a.lastVisit || '');
    });
    return list;
  }, [customers, search, sort]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Customer insights (most requested services)
  const serviceDemand = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => { map[b.serviceId] = (map[b.serviceId] || 0) + 1; });
    return services.map(s => ({ service: s, count: map[s.id] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [bookings, services]);

  const totalBookings = bookings.length;
  const topServices = serviceDemand.filter(s => s.count > 0).slice(0, 5);
  const leastServices = [...serviceDemand].filter(s => s.count > 0).sort((a, b) => a.count - b.count).slice(0, 3);

  const mostBookedStaff = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => { map[b.staffId] = (map[b.staffId] || 0) + 1; });
    return staff.map(s => ({ staff: s, count: map[s.id] || 0 })).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [bookings, staff]);

  const mostFrequentCustomers = [...customers].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);
  const repeatRate = customers.length > 0 ? Math.round(customers.filter(c => c.totalBookings > 1).length / customers.length * 100) : 0;

  // Peak hours/days
  const peakHours = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const h = parseInt(b.startTime.split(':')[0]);
      const key = h < 12 ? 'Morning (9-12)' : h < 17 ? 'Afternoon (12-5)' : 'Evening (5-7)';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [bookings]);

  const peakDays = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const d = new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [bookings]);

  if (selectedCustomer) {
    return <CustomerProfile customerId={selectedCustomer.id} onBack={() => selectCustomer(null)} />;
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} customers · ${repeatRate}% repeat rate`} />

      {/* Customer Insights section */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Customer Insights & Demand</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Most requested services */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-status-completed" /> Most Requested Services</p>
            <div className="space-y-1.5">
              {topServices.map((s, i) => (
                <div key={s.service.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                  <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-status-completed text-status-completed' : 'bg-muted text-muted-foreground')}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.service.name}</p>
                    <p className="text-xs text-muted-foreground">{s.count} bookings · {Math.round(s.count / totalBookings * 100)}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Most booked staff */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-status-upcoming" /> Most Booked Staff</p>
              <div className="space-y-1.5">
                {mostBookedStaff.map((s, i) => (
                  <div key={s.staff.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="text-xs font-bold w-5">{i + 1}.</span>
                    <Avatar src={s.staff.photo} alt={s.staff.name} size={28} />
                    <span className="text-sm font-medium flex-1 truncate">{s.staff.name}</span>
                    <span className="text-xs text-muted-foreground">{s.count} bookings</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repeat rate */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Customer Loyalty</p>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{repeatRate}%</p>
                <p className="text-xs text-muted-foreground">Repeat customer rate · {customers.filter(c => c.totalBookings > 1).length} of {customers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Peak hours & days */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-status-pending" /> Peak Booking Times</p>
            <div className="flex gap-2 flex-wrap">
              {peakHours.map(([k, v]) => (
                <div key={k} className="px-3 py-1.5 rounded-lg bg-muted/30 text-xs">
                  <span className="font-medium">{k}</span> · <span className="text-muted-foreground">{v} bookings</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><CalIcon className="w-3.5 h-3.5 text-status-upcoming" /> Peak Booking Days</p>
            <div className="flex gap-2 flex-wrap">
              {peakDays.map(([k, v]) => (
                <div key={k} className="px-3 py-1.5 rounded-lg bg-muted/30 text-xs">
                  <span className="font-medium">{k}</span> · <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Least requested services */}
        <div className="mt-5">
          <p className="text-sm font-medium mb-2">Least Requested Services</p>
          <div className="flex gap-2 flex-wrap">
            {leastServices.map(s => (
              <div key={s.service.id} className="px-3 py-1.5 rounded-lg bg-muted/30 text-xs">
                {s.service.name} · <span className="text-muted-foreground">{s.count} bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer list */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="spent">Highest Spend</SelectItem>
            <SelectItem value="bookings">Most Bookings</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" subtitle="Try a different search." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => selectCustomer(c.id)}
              className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <Avatar src={c.image} alt={c.name} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                  {c.lastVisit && <p className="text-xs text-muted-foreground mt-0.5">Last visit: {formatDate(c.lastVisit).split(' ').slice(0, 2).join(' ')}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-sm font-bold">{c.totalBookings}</p>
                  <p className="text-[10px] text-muted-foreground">Bookings</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-sm font-bold">{c.completedBookings}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-sm font-bold">{formatCurrency(c.totalSpent).replace('₹', '₹')}</p>
                  <p className="text-[10px] text-muted-foreground">Spent</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerProfile({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const customers = useSalonStore(s => s.customers);
  const bookings = useSalonStore(s => s.bookings);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const reviews = useSalonStore(s => s.reviews);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setView = useSalonStore(s => s.setView);

  const c = customers.find(x => x.id === customerId);
  if (!c) return null;

  const custBookings = bookings.filter(b => b.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
  const favoriteServices = services.filter(s => c.favoriteServices.includes(s.id));
  const preferredStaff = staff.filter(s => c.preferredStaff.includes(s.id));
  const custReviews = reviews.filter(r => r.customerId === customerId);

  const openBooking = (id: string) => { selectBooking(id); setView('bookings'); };

  return (
    <div>
      <BackButton label="All Customers" onClick={onBack} />

      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar src={c.image} alt={c.name} size={80} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{c.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{c.phone} · {c.email || 'No email'}</p>
            <p className="text-xs text-muted-foreground mt-1">Customer since {formatDate(c.joinedDate).split(' ').slice(0, 2).join(' ')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Total Bookings</p>
          <p className="text-lg font-bold">{c.totalBookings}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-lg font-bold">{c.completedBookings}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Cancelled</p>
          <p className="text-lg font-bold">{c.cancelledBookings}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-lg font-bold">{formatCurrency(c.totalSpent)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visit info */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Visit Information</h3>
          <div className="space-y-2.5">
            {c.lastVisit && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <span className="text-sm">Last Visit</span>
                <span className="text-sm font-medium">{formatDate(c.lastVisit)}</span>
              </div>
            )}
            {c.nextAppointment && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-upcoming/15">
                <span className="text-sm">Next Appointment</span>
                <span className="text-sm font-medium">{formatDate(c.nextAppointment)}</span>
              </div>
            )}
            {c.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">{c.notes}</p>
              </div>
            )}
          </div>

          {favoriteServices.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Favorite Services</p>
              <div className="flex gap-1.5 flex-wrap">
                {favoriteServices.map(s => (
                  <span key={s.id} className="px-2.5 py-1 rounded-lg bg-accent/60 text-xs font-medium">{s.name}</span>
                ))}
              </div>
            </div>
          )}
          {preferredStaff.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Preferred Staff</p>
              <div className="flex gap-1.5 flex-wrap">
                {preferredStaff.map(s => (
                  <span key={s.id} className="px-2.5 py-1 rounded-lg bg-accent/60 text-xs font-medium">{s.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reviews by customer */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Reviews ({custReviews.length})</h3>
          {custReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No reviews yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scroll-area-custom">
              {custReviews.map(r => (
                <div key={r.id} className="p-2.5 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-muted-foreground">{formatDate(r.date).split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  <p className="text-sm">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking history */}
      <div className="rounded-2xl border border-border bg-card p-5 mt-5">
        <h3 className="font-semibold mb-3">Booking History ({custBookings.length})</h3>
        {custBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No bookings yet.</p>
        ) : (
          <div className="space-y-1.5">
            {custBookings.map(b => (
              <button key={b.id} onClick={() => openBooking(b.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left">
                <div className="text-center shrink-0 min-w-[60px]">
                  <p className="text-xs font-semibold">{formatDate(b.date).split(' ').slice(0, 2).join(' ')}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(b.startTime)}</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.serviceName}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.staffName}</p>
                </div>
                <span className="text-sm font-semibold shrink-0">{formatCurrency(b.price)}</span>
                <StatusBadge status={b.status} className="text-[10px] px-1.5 py-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
