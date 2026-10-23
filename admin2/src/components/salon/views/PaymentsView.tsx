'use client';
import { useMemo, useState } from 'react';
import { useSalonStore } from '@/lib/store';
import {
  calculateAllRevenues, sumPaid,
  getRangeBounds, getMonthBounds, getYearBounds,
  filterPaymentsByBounds,
  calculateRevenueByBounds, getYearlyMonthlyBreakdown, formatMonthLabel,
} from '@/lib/revenue';
import { PageHeader, EmptyState } from '../ui';
import { StatusBadge, formatCurrency, formatDate, todayStr } from '../shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { PaymentDetailsDialog } from '../dialogs/PaymentDetailsDialog';
import {
  Wallet, Search, X, Plus, Calendar, ChevronLeft, ChevronRight, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type Range = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM';

const RANGE_LABELS: Record<Range, string> = {
  TODAY: 'Today',
  WEEK: 'This Week',
  MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  CUSTOM: 'Custom',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

export function PaymentsView() {
  const payments = useSalonStore(s => s.payments);
  const bookings = useSalonStore(s => s.bookings);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setView = useSalonStore(s => s.setView);
  const paymentFilter = useSalonStore(s => s.paymentFilter);
  const setPaymentFilter = useSalonStore(s => s.setPaymentFilter);

  const today = todayStr();
  const todayDate = new Date(today + 'T00:00:00');
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth() + 1;

  const range = paymentFilter.range;
  const statusFilter = paymentFilter.statusFilter;
  const search = paymentFilter.search;
  const customMode = paymentFilter.customMode;
  const customYear = paymentFilter.customYear;
  const customMonth = paymentFilter.customMonth;

  // Revenue cards — Today/Week/Month/LastMonth (All Time removed per request)
  const revenues = useMemo(() => calculateAllRevenues(payments, today), [payments, today]);
  const allTimeRevenue = revenues.allTime; // used only in the header subtitle

  // Compute the active date bounds based on the selected range
  const bounds = useMemo(() => {
    if (range === 'CUSTOM') {
      if (customMode === 'YEAR') return getYearBounds(customYear);
      return getMonthBounds(customYear, customMonth);
    }
    return getRangeBounds(range, today);
  }, [range, today, customMode, customYear, customMonth]);

  // Filter payments by the active date bounds — single source of truth
  const rangePayments = useMemo(
    () => filterPaymentsByBounds(payments, bounds.start, bounds.end),
    [payments, bounds.start, bounds.end]
  );

  // Apply status filter (drop-down)
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'ALL') return rangePayments;
    return rangePayments.filter(p => p.status === statusFilter);
  }, [rangePayments, statusFilter]);

  // Apply search WITHIN the already-filtered set
  const filtered = useMemo(() => {
    if (!search.trim()) return statusFiltered;
    const q = search.toLowerCase();
    return statusFiltered.filter(p =>
      p.customerName.toLowerCase().includes(q) ||
      p.serviceName.toLowerCase().includes(q) ||
      p.bookingId.toLowerCase().includes(q) ||
      (p.transactionId || '').toLowerCase().includes(q)
    );
  }, [statusFiltered, search]);

  // Sort by date desc, time desc
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const ta = bookings.find(x => x.id === a.bookingId)?.startTime || '';
    const tb = bookings.find(x => x.id === b.bookingId)?.startTime || '';
    return tb.localeCompare(ta);
  }), [filtered, bookings]);

  const displayCount = sorted.length;
  const collectedRevenue = sumPaid(sorted);

  // Revenue Explorer — monthly breakdown chart for the selected year
  const monthlyBreakdown = useMemo(
    () => getYearlyMonthlyBreakdown(payments, customYear),
    [payments, customYear]
  );
  const yearRevenue = monthlyBreakdown.reduce((s, m) => s + m.revenue, 0);
  const monthBounds = useMemo(() => getMonthBounds(customYear, customMonth), [customYear, customMonth]);
  const monthRevenueCalc = useMemo(
    () => calculateRevenueByBounds(payments, monthBounds.start, monthBounds.end),
    [payments, monthBounds.start, monthBounds.end]
  );

  // Active filter chips
  const activeChips: { label: string; onClear: () => void }[] = [];
  if (range === 'CUSTOM') {
    activeChips.push({
      label: customMode === 'YEAR' ? `Year ${customYear}` : formatMonthLabel(customYear, customMonth),
      onClear: () => setPaymentFilter({ range: 'MONTH' }), // back to This Month
    });
  } else {
    activeChips.push({ label: RANGE_LABELS[range], onClear: () => setPaymentFilter({ range: 'MONTH' }) });
  }
  if (statusFilter !== 'ALL') {
    activeChips.push({
      label: statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase(),
      onClear: () => setPaymentFilter({ statusFilter: 'ALL' }),
    });
  }
  if (search.trim()) {
    activeChips.push({ label: `"${search}"`, onClear: () => setPaymentFilter({ search: '' }) });
  }

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setDetailsOpen(true);
  };

  const markPaidInline = (paymentId: string) => {
    useSalonStore.getState().updatePaymentStatus(paymentId, 'PAID');
  };

  const handleCardClick = (r: Range) => setPaymentFilter({ range: r });

  // Build a human-readable range label for the summary
  const rangeLabel = range === 'TODAY' ? 'today'
    : range === 'WEEK' ? 'this week'
    : range === 'MONTH' ? 'this month'
    : range === 'LAST_MONTH' ? 'last month'
    : customMode === 'YEAR' ? `in ${customYear}`
    : `in ${formatMonthLabel(customYear, customMonth)}`;

  // Year navigation in the explorer
  const goPrevYear = () => setPaymentFilter({ customYear: customYear - 1, range: 'CUSTOM' });
  const goNextYear = () => setPaymentFilter({ customYear: customYear + 1, range: 'CUSTOM' });
  const goPrevMonth = () => {
    if (customMonth === 1) setPaymentFilter({ customMonth: 12, customYear: customYear - 1, range: 'CUSTOM' });
    else setPaymentFilter({ customMonth: customMonth - 1, range: 'CUSTOM' });
  };
  const goNextMonth = () => {
    if (customMonth === 12) setPaymentFilter({ customMonth: 1, customYear: customYear + 1, range: 'CUSTOM' });
    else setPaymentFilter({ customMonth: customMonth + 1, range: 'CUSTOM' });
  };

  const setCustomMode = (mode: 'MONTH' | 'YEAR') => setPaymentFilter({ range: 'CUSTOM', customMode: mode });
  const selectMonth = (m: number) => setPaymentFilter({ range: 'CUSTOM', customMode: 'MONTH', customMonth: m });

  // Years available in the year dropdown (from oldest payment to current + 1)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach(p => years.add(parseInt(p.date.slice(0, 4))));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [payments, currentYear]);

  return (
    <div>
      <PageHeader
        title="Payments & Revenue"
        subtitle={`${formatCurrency(allTimeRevenue)} all-time collected`}
        action={
          <Button variant="outline" size="sm" onClick={() => setView('bookings')}>
            <Plus className="w-4 h-4 mr-1.5" /> New Booking
          </Button>
        }
      />

      {/* Quick revenue cards — Today/Week/Month/LastMonth (All Time removed per request) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <RevenueCard label="Today" value={revenues.today} active={range === 'TODAY'} onClick={() => handleCardClick('TODAY')} />
        <RevenueCard label="This Week" value={revenues.week} active={range === 'WEEK'} onClick={() => handleCardClick('WEEK')} />
        <RevenueCard label="This Month" value={revenues.month} active={range === 'MONTH'} onClick={() => handleCardClick('MONTH')} />
        <RevenueCard label="Last Month" value={revenues.lastMonth} active={range === 'LAST_MONTH'} onClick={() => handleCardClick('LAST_MONTH')} />
      </div>

      {/* Revenue Explorer — pick any month or year to view earnings */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Revenue Explorer</h3>
              <p className="text-xs text-muted-foreground">View earnings for any month or year</p>
            </div>
          </div>
          {/* Mode toggle: Month / Year */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
            <button
              onClick={() => setCustomMode('MONTH')}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                customMode === 'MONTH' ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              By Month
            </button>
            <button
              onClick={() => setCustomMode('YEAR')}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                customMode === 'YEAR' ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              By Year
            </button>
          </div>
        </div>

        {/* Explorer controls */}
        {customMode === 'MONTH' ? (
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <div className="px-4 py-2 rounded-xl bg-muted/40 min-w-[180px] text-center">
                <p className="font-semibold">{formatMonthLabel(customYear, customMonth)}</p>
              </div>
              <Button variant="outline" size="icon" onClick={goNextMonth}><ChevronRight className="w-4 h-4" /></Button>
              <Select value={String(customMonth)} onValueChange={(v) => selectMonth(Number(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(customYear)} onValueChange={(v) => setPaymentFilter({ customYear: Number(v), range: 'CUSTOM' })}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPaymentFilter({ customYear: currentYear, customMonth: currentMonth, range: 'CUSTOM' })}>
                This Month
              </Button>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Collected in {formatMonthLabel(customYear, customMonth)}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(monthRevenueCalc)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrevYear}><ChevronLeft className="w-4 h-4" /></Button>
              <div className="px-4 py-2 rounded-xl bg-muted/40 min-w-[100px] text-center">
                <p className="font-semibold">{customYear}</p>
              </div>
              <Button variant="outline" size="icon" onClick={goNextYear}><ChevronRight className="w-4 h-4" /></Button>
              <Select value={String(customYear)} onValueChange={(v) => setPaymentFilter({ customYear: Number(v), range: 'CUSTOM' })}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPaymentFilter({ customYear: currentYear, range: 'CUSTOM' })}>
                This Year
              </Button>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Collected in {customYear}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(yearRevenue)}</p>
            </div>
          </div>
        )}

        {/* Yearly bar chart — always visible; highlights the selected month in MONTH mode */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0.92 0 0)' }}
                formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']}
                labelFormatter={(l: any) => `${l} ${customYear}`}
              />
              <Bar
                dataKey="revenue"
                fill="oklch(0.51 0.097 173)"
                radius={[6, 6, 0, 0]}
                onClick={(data: any) => {
                  if (data && data.month) {
                    selectMonth(data.month);
                  }
                }}
                cursor="pointer"
              >
                {monthlyBreakdown.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={customMode === 'MONTH' && entry.month === customMonth ? 'oklch(0.40 0.087 173)' : 'oklch(0.51 0.097 173)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {customMode === 'YEAR'
            ? `Tip: Click any month bar above to switch to month view and see its individual transactions below.`
            : `Showing transactions for ${formatMonthLabel(customYear, customMonth)} in the table below. Click any other bar to switch to that month.`}
        </p>

        {/* Apply current selection to table */}
        <div className="mt-3 flex justify-center">
          <Button
            size="sm"
            variant={range === 'CUSTOM' ? 'default' : 'outline'}
            onClick={() => setPaymentFilter({ range: 'CUSTOM' })}
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            {customMode === 'YEAR'
              ? `Show ${customYear} transactions in table`
              : `Show ${formatMonthLabel(customYear, customMonth)} transactions in table`}
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
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
            onClick={() => setPaymentFilter({ range: 'MONTH', statusFilter: 'ALL', search: '' })}
            className="text-xs text-status-cancelled hover:underline ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filters row: range tabs + search + status dropdown */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 flex-wrap">
          {(['TODAY', 'WEEK', 'MONTH', 'LAST_MONTH'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setPaymentFilter({ range: r })}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                range === r ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
          <button
            onClick={() => setPaymentFilter({ range: 'CUSTOM' })}
            className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1',
              range === 'CUSTOM' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <Calendar className="w-3.5 h-3.5" />
            {customMode === 'YEAR' ? `Year ${customYear}` : formatMonthLabel(customYear, customMonth)}
          </button>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, service, booking or txn ID..."
            value={search}
            onChange={(e) => setPaymentFilter({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setPaymentFilter({ statusFilter: v })}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Live summary — count + collected revenue (always matches the displayed rows) */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{displayCount}</span> payment{displayCount !== 1 ? 's' : ''} {rangeLabel}
              {statusFilter !== 'ALL' && ` · ${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}`}
              {search.trim() && ` · matching "${search}"`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Range: {bounds.start === '0000-01-01' ? 'all time'
                : bounds.start === bounds.end ? formatDate(bounds.start)
                : `${formatDate(bounds.start).split(' ').slice(0, 2).join(' ')} – ${formatDate(bounds.end).split(' ').slice(0, 2).join(' ')}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Collected revenue in selection</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(collectedRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Payment table */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments to show"
          subtitle={
            search.trim() ? 'No payments match your search. Try a different keyword.'
            : statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} payments in this date range.`
            : `No payments ${rangeLabel}.`
          }
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Payment</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Customer</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Service</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Method</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Date</th>
                  <th className="text-right p-3 font-medium text-xs text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-xs text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => openPayment(p.id)}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <p className="font-mono text-xs font-semibold">{p.id}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.bookingId.slice(-6)}</p>
                    </td>
                    <td className="p-3 font-medium">{p.customerName}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{p.serviceName}</td>
                    <td className="p-3 hidden sm:table-cell">{p.method}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(p.date).split(' ').slice(0, 2).join(' ')}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="p-3"><StatusBadge status={p.status} className="text-[10px] px-1.5 py-0.5" /></td>
                    <td className="p-3 text-right">
                      {p.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); markPaidInline(p.id); }}
                          className="h-7 text-xs"
                        >
                          Mark Paid
                        </Button>
                      )}
                      {p.status === 'PAID' && (
                        <span className="text-xs text-muted-foreground">View →</span>
                      )}
                      {p.status === 'REFUNDED' && (
                        <span className="text-xs text-status-blocked">Refunded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border">
                <tr>
                  <td className="p-3 text-xs text-muted-foreground" colSpan={5}>
                    {displayCount} payment{displayCount !== 1 ? 's' : ''} {rangeLabel}
                  </td>
                  <td className="p-3 text-right font-bold">{formatCurrency(sorted.reduce((s, p) => s + p.amount, 0))}</td>
                  <td className="p-3 text-xs text-muted-foreground" colSpan={2}>
                    Collected: <span className="font-semibold text-foreground">{formatCurrency(collectedRevenue)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <PaymentDetailsDialog
        paymentId={selectedPaymentId}
        open={detailsOpen}
        onOpenChange={(o) => { setDetailsOpen(o); if (!o) setSelectedPaymentId(null); }}
      />
    </div>
  );
}

function RevenueCard({ label, value, active, onClick }: {
  label: string; value: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-4 rounded-2xl border transition-all relative',
        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-0.5">{formatCurrency(value)}</p>
      {active && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  );
}
