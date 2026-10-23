'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader } from '../ui';
import { formatCurrency, todayStr, formatTime } from '../shared';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Calendar, Star, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type Range = 'TODAY' | '7D' | '30D' | 'MONTH' | 'LAST_MONTH';

// Coherent chart palette — Primary Green, Informational Blue, Emerald, Amber, Sage
const CHART_COLORS = [
  '#087F68',  // Primary Green
  '#2563A6',  // Informational Blue
  '#10A88A',  // Emerald
  '#D97706',  // Amber
  '#B7C8BF',  // Neutral Sage
];

export function AnalyticsView() {
  const bookings = useSalonStore(s => s.bookings);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const customers = useSalonStore(s => s.customers);
  const payments = useSalonStore(s => s.payments);

  const [range, setRange] = useState<Range>('30D');

  const today = todayStr();
  const getRangeStart = () => {
    const d = new Date();
    if (range === 'TODAY') return today;
    if (range === '7D') d.setDate(d.getDate() - 6);
    else if (range === '30D') d.setDate(d.getDate() - 29);
    else if (range === 'MONTH') { d.setDate(1); }
    else if (range === 'LAST_MONTH') {
      d.setMonth(d.getMonth() - 1); d.setDate(1);
    }
    return d.toISOString().split('T')[0];
  };
  const rangeStart = getRangeStart();
  const rangeEnd = today;

  // Helper: check if a date is in selected range
  const inRange = (date: string) => date >= rangeStart && date <= rangeEnd;

  // Revenue chart data - daily. Uses payments[] (single source of truth, same as Dashboard & Payments views)
  // so revenue numbers across the app always match.
  const revenueData = useMemo(() => {
    const map: Record<string, { revenue: number; bookings: number }> = {};
    // Revenue = sum of PAID payments per day; bookings = all non-cancelled bookings per day
    payments.filter(p => p.status === 'PAID' && p.date >= rangeStart && p.date <= rangeEnd).forEach(p => {
      map[p.date] = map[p.date] || { revenue: 0, bookings: 0 };
      map[p.date].revenue += p.amount;
    });
    bookings.filter(b => b.status !== 'CANCELLED' && b.date >= rangeStart && b.date <= rangeEnd).forEach(b => {
      map[b.date] = map[b.date] || { revenue: 0, bookings: 0 };
      map[b.date].bookings += 1;
    });
    // Fill in dates with zero
    const dates: string[] = [];
    const d = new Date(rangeStart + 'T00:00:00');
    while (d.toISOString().split('T')[0] <= rangeEnd) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates.map(date => ({
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: map[date]?.revenue || 0,
      bookings: map[date]?.bookings || 0,
    }));
  }, [payments, bookings, rangeStart, rangeEnd]);

  // Bookings by service
  const bookingsByService = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.filter(b => b.date >= rangeStart && b.date <= rangeEnd).forEach(b => {
      map[b.serviceName] = (map[b.serviceName] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [bookings, rangeStart, rangeEnd]);

  // Bookings by status
  const bookingsByStatus = useMemo(() => {
    const map: Record<string, number> = { PENDING: 0, UPCOMING: 0, COMPLETED: 0, CANCELLED: 0 };
    bookings.filter(b => b.date >= rangeStart && b.date <= rangeEnd).forEach(b => { map[b.status]++; });
    return [
      { name: 'Completed', value: map.COMPLETED, color: 'oklch(0.51 0.10 145)' },   // green
      { name: 'Pending', value: map.PENDING, color: 'oklch(0.65 0.15 65)' },         // amber
      { name: 'Upcoming', value: map.UPCOMING, color: 'oklch(0.55 0.13 250)' },      // blue
      { name: 'Cancelled', value: map.CANCELLED, color: 'oklch(0.55 0.18 25)' },      // red
    ];
  }, [bookings, rangeStart, rangeEnd]);

  // Bookings by staff — revenue from PAID payments (consistent with Dashboard & Payments)
  const bookingsByStaff = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; completed: number }> = {};
    bookings.filter(b => b.date >= rangeStart && b.date <= rangeEnd).forEach(b => {
      map[b.staffName] = map[b.staffName] || { count: 0, revenue: 0, completed: 0 };
      map[b.staffName].count++;
      if (b.status === 'COMPLETED') map[b.staffName].completed++;
    });
    payments.filter(p => p.status === 'PAID' && p.date >= rangeStart && p.date <= rangeEnd && p.staffName).forEach(p => {
      const key = p.staffName as string;
      map[key] = map[key] || { count: 0, revenue: 0, completed: 0 };
      map[key].revenue += p.amount;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);
  }, [bookings, payments, rangeStart, rangeEnd]);

  // Peak hours
  const peakHours = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.filter(b => b.date >= rangeStart && b.date <= rangeEnd).forEach(b => {
      const h = parseInt(b.startTime.split(':')[0]);
      map[`${h}:00`] = (map[`${h}:00`] || 0) + 1;
    });
    return Object.entries(map).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [bookings, rangeStart, rangeEnd]);

  // Stats
  const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = bookings.filter(b => inRange(b.date)).length;
  const completedBookings = bookings.filter(b => inRange(b.date) && b.status === 'COMPLETED').length;
  const cancelledBookings = bookings.filter(b => inRange(b.date) && b.status === 'CANCELLED').length;
  const pendingBookings = bookings.filter(b => inRange(b.date) && b.status === 'PENDING').length;
  const upcomingBookings = bookings.filter(b => inRange(b.date) && b.status === 'UPCOMING').length;

  // Customer analytics
  const newCustomers = customers.filter(c => inRange(c.joinedDate)).length;
  const returningCustomers = customers.filter(c => c.completedBookings > 1).length;
  const repeatRate = customers.length > 0 ? Math.round(returningCustomers / customers.length * 100) : 0;
  const avgSpend = customers.length > 0 ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length) : 0;
  const loyalCustomers = [...customers].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);

  // Service analytics - revenue by service (uses payments[] for consistency)
  const revenueByService = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    payments.filter(p => p.status === 'PAID' && p.date >= rangeStart && p.date <= rangeEnd).forEach(p => {
      map[p.serviceName] = map[p.serviceName] || { count: 0, revenue: 0 };
      map[p.serviceName].count++;
      map[p.serviceName].revenue += p.amount;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [payments, rangeStart, rangeEnd]);

  // Most/least booked
  const mostBookedService = bookingsByService[0];
  const leastBookedService = bookingsByService[bookingsByService.length - 1];
  const mostBookedStaff = bookingsByStaff[0];

  // Today/yesterday revenue for trend (uses payments[] for consistency with Dashboard & Payments views)
  const todayRevenue = payments.filter(p => p.date === today && p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayRevenue = payments.filter(p => p.date === yesterdayStr && p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Business performance and insights"
        action={
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
            {(['TODAY', '7D', '30D', 'MONTH', 'LAST_MONTH'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  range === r ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
                {r === 'TODAY' ? 'Today' : r === '7D' ? '7 Days' : r === '30D' ? '30 Days' : r === 'MONTH' ? 'This Month' : 'Last Month'}
              </button>
            ))}
          </div>
        }
      />

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-status-completed/15 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-status-completed" />
            </div>
            {yesterdayRevenue > 0 && todayRevenue !== yesterdayRevenue && (
              <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                todayRevenue > yesterdayRevenue ? 'bg-status-completed' : 'bg-status-cancelled text-white')}>
                {todayRevenue > yesterdayRevenue ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(Math.round((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100))}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
          <p className="text-xs text-muted-foreground">Today's revenue</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-status-upcoming/15 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-status-upcoming" />
            </div>
          </div>
          <p className="text-2xl font-bold">{totalBookings}</p>
          <p className="text-xs text-muted-foreground">Bookings in range</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-status-completed/15 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-status-completed" />
            </div>
          </div>
          <p className="text-2xl font-bold">{newCustomers}</p>
          <p className="text-xs text-muted-foreground">New customers</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-status-pending/15 flex items-center justify-center">
              <Star className="w-4.5 h-4.5 text-status-pending" />
            </div>
          </div>
          <p className="text-2xl font-bold">{repeatRate}%</p>
          <p className="text-xs text-muted-foreground">Repeat rate · {avgSpend} avg spend</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Revenue & Bookings Over Time</h3>
          <div className="text-right">
            <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Total in range</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0.92 0 0)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="oklch(0.51 0.097 173)" strokeWidth={2} name="Revenue (₹)" dot={false} />
              <Line type="monotone" dataKey="bookings" stroke="oklch(0.55 0.13 250)" strokeWidth={2} name="Bookings" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Bookings by status */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Bookings by Status</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bookingsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {bookingsByStatus.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings by service */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Bookings by Service</h3>
          {bookingsByService.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No bookings in range</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByService.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="count" fill="oklch(0.51 0.097 173)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Peak hours */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Peak Booking Hours</h3>
          {peakHours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No bookings in range</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="count" fill="oklch(0.55 0.13 250)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Staff performance */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Staff Performance</h3>
          {bookingsByStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No staff bookings in range</p>
          ) : (
            <div className="space-y-2">
              {bookingsByStaff.map((s, i) => (
                <div key={s.name} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs font-semibold">{formatCurrency(s.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(s.count / Math.max(...bookingsByStaff.map(b => b.count))) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">{s.count} bookings · {s.completed} done</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Service revenue breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <h3 className="font-semibold mb-4">Revenue by Service</h3>
        {revenueByService.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No completed bookings in range</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Service</th>
                  <th className="text-right p-2 text-xs text-muted-foreground font-medium">Bookings</th>
                  <th className="text-right p-2 text-xs text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right p-2 text-xs text-muted-foreground font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revenueByService.map(s => {
                  const share = totalRevenue > 0 ? Math.round(s.revenue / totalRevenue * 100) : 0;
                  return (
                    <tr key={s.name}>
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2 text-right">{s.count}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(s.revenue)}</td>
                      <td className="p-2 text-right text-muted-foreground">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer insights */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Customer Insights</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Total customers</p>
            <p className="text-xl font-bold">{customers.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">New</p>
            <p className="text-xl font-bold">{newCustomers}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Returning</p>
            <p className="text-xl font-bold">{returningCustomers}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Avg spend</p>
            <p className="text-xl font-bold">{formatCurrency(avgSpend)}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Most Loyal Customers</p>
          <div className="space-y-1.5">
            {loyalCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                <span className="text-xs font-bold w-5">{i + 1}.</span>
                <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.totalBookings} bookings · {formatCurrency(c.totalSpent)} spent</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
