'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Building2,
  User,
  Clock,
  Scissors,
  MapPin,
  ExternalLink,
  Plus,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  Lock,
  Unlock,
  Check,
  Ban,
  Calendar,
} from 'lucide-react';

interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  salonId: string;
  staffId?: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  price: number;
  commissionRate: number;
  commissionAmount: number;
  salonPayoutAmount: number;
  bookingStatus: string;
  paymentStatus: string;
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string; email: string };
  salon: {
    id: string;
    name: string;
    locality: string;
    city: string;
    address: string;
    businessHoursJson?: string;
  };
  service: {
    id: string;
    name: string;
    durationMin: number;
    basePrice: number;
    category?: { id: string; name: string };
  };
  staff?: { id: string; name: string; role: string; phone?: string; isAvailable?: boolean };
  payment?: {
    id: string;
    transactionNumber: string;
    amount: number;
    paymentMethod: string;
    status: string;
    salonPayoutAmount: number;
    commissionAmount: number;
  };
}

interface BlockedSlot {
  id: string;
  salonId: string;
  staffId?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  blockedByAdmin?: string;
  createdAt?: string;
}

interface Salon {
  id: string;
  name: string;
  locality: string;
  city: string;
  address: string;
  businessHoursJson?: string;
}

interface StaffMember {
  id: string;
  name: string;
  salonId: string;
  role: string;
  isAvailable?: boolean;
}

function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, offsetDays: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(year, month, day + offsetDays);
  return formatDateString(d);
}

function addMonths(dateStr: string, offsetMonths: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const maxDays = new Date(year, month + offsetMonths + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  const d = new Date(year, month + offsetMonths, targetDay);
  return formatDateString(d);
}

function CalendarContent() {
  const [currentDate, setCurrentDate] = useState('2026-10-13');
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [salonId, setSalonId] = useState('ALL');
  const [staffId, setStaffId] = useState('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calendar API Data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [monthGrid, setMonthGrid] = useState<
    Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }>
  >([]);
  const [summary, setSummary] = useState({
    total: 0,
    confirmed: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    noShow: 0,
    blocked: 0,
  });

  // Selected Booking Details Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [cancellationPrompt, setCancellationPrompt] = useState<{
    open: boolean;
    reason: string;
  }>({ open: false, reason: '' });

  // Block Slot Modal
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    salonId: '',
    staffId: '',
    date: '2026-10-13',
    startTime: '13:00',
    endTime: '14:00',
    reason: 'Stylist Lunch & Rest Break',
  });
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const query = new URLSearchParams({
        date: currentDate,
        view,
        salonId,
        staffId,
        bookingStatus: bookingStatusFilter,
      });
      const res = await fetch(`/api/calendar?${query.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load calendar data (${res.status})`);
      }
      const json = await res.json();
      setBookings(json.bookings || []);
      setBlockedSlots(json.blockedSlots || []);
      setSalons(json.salons || []);
      setStaff(json.staff || []);
      setSummary(
        json.summary || {
          total: 0,
          confirmed: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          noShow: 0,
          blocked: 0,
        }
      );
      if (json.weekDays) setWeekDays(json.weekDays);
      if (json.monthGrid) setMonthGrid(json.monthGrid);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Error communicating with calendar backend.');
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, salonId, staffId, bookingStatusFilter]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // When salon changes, ensure selected staff still belongs to that salon
  const handleSalonChange = (newSalonId: string) => {
    setSalonId(newSalonId);
    if (newSalonId !== 'ALL' && staffId !== 'ALL') {
      const staffBelongs = staff.some((st) => st.id === staffId && st.salonId === newSalonId);
      if (!staffBelongs) {
        setStaffId('ALL');
      }
    }
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate('2026-10-13');
      return;
    }

    if (view === 'day') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 7 : -7));
    } else if (view === 'month') {
      setCurrentDate(addMonths(currentDate, direction === 'next' ? 1 : -1));
    }
  };

  const availableStaff = useMemo(() => {
    if (salonId === 'ALL') return staff;
    return staff.filter((st) => st.salonId === salonId);
  }, [staff, salonId]);

  // Header display title
  const formattedHeaderTitle = useMemo(() => {
    const { year, month, day } = parseDateParts(currentDate);
    const d = new Date(year, month, day);

    if (view === 'day') {
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (view === 'week') {
      if (weekDays.length === 7) {
        const dStart = new Date(parseDateParts(weekDays[0]).year, parseDateParts(weekDays[0]).month, parseDateParts(weekDays[0]).day);
        const dEnd = new Date(parseDateParts(weekDays[6]).year, parseDateParts(weekDays[6]).month, parseDateParts(weekDays[6]).day);
        return `${dStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${dEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [currentDate, view, weekDays]);

  // Update booking status from modal
  const handleUpdateBookingStatus = async (targetStatus: string, reason?: string) => {
    if (!selectedBooking) return;
    setStatusActionLoading(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          bookingId: selectedBooking.id,
          bookingStatus: targetStatus,
          cancellationReason: reason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update booking status.');
      }
      setSelectedBooking(null);
      setCancellationPrompt({ open: false, reason: '' });
      fetchCalendar();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStatusActionLoading(false);
    }
  };

  // Block a time slot
  const handleBlockSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockLoading(true);
    setBlockError(null);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BLOCK_SLOT',
          ...blockFormData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to block time slot.');
      }
      setIsBlockModalOpen(false);
      fetchCalendar();
    } catch (err: any) {
      setBlockError(err.message);
    } finally {
      setBlockLoading(false);
    }
  };

  // Unblock a slot
  const handleUnblockSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to unblock this time slot and restore customer availability?')) return;
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UNBLOCK_SLOT',
          slotId,
        }),
      });
      if (res.ok) {
        fetchCalendar();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate hourly schedule slots for Day View (from 09:00 to 20:00)
  const dayScheduleHours = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
  ];

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Calendar & Slots' }]}
      title="Booking Calendar & Slot Availability"
      description="Monitor appointment density, inspect stylist time slots, manage slot blocking, and view real-time booking allocations across partner salons."
      actions={
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-white border border-[#E2E8E6] rounded-xl p-0.5 shadow-2xs">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  view === v
                    ? 'bg-[#0F766E] text-white shadow-2xs'
                    : 'text-[#64706E] hover:text-[#17201F]'
                }`}
              >
                {v} View
              </button>
            ))}
          </div>

          {/* Block Slot Action */}
          <button
            onClick={() => {
              const defaultSalon = salonId !== 'ALL' ? salonId : salons[0]?.id || '';
              setBlockFormData({
                salonId: defaultSalon,
                staffId: staffId !== 'ALL' ? staffId : '',
                date: currentDate,
                startTime: '13:00',
                endTime: '14:00',
                reason: 'Stylist Lunch & Rest Break',
              });
              setIsBlockModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Block Time Slot</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchCalendar}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Calendar"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Error Alert if request failed */}
      {errorMessage && (
        <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchCalendar}
            className="text-xs font-semibold text-rose-800 underline hover:no-underline cursor-pointer"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-5">
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-[#64706E]">Total Scheduled</div>
          <div className="text-lg font-bold text-[#17201F] mt-0.5">{summary.total}</div>
          <div className="text-[10px] text-teal-700 font-medium">In selected range</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-[#64706E]">Confirmed</div>
          <div className="text-lg font-bold text-teal-700 mt-0.5">{summary.confirmed}</div>
          <div className="text-[10px] text-teal-600">Active slots</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-[#64706E]">Completed</div>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">{summary.completed}</div>
          <div className="text-[10px] text-emerald-600">Finished service</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-[#64706E]">Pending</div>
          <div className="text-lg font-bold text-amber-700 mt-0.5">{summary.pending}</div>
          <div className="text-[10px] text-amber-600">Awaiting salon</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-[#64706E]">Cancelled</div>
          <div className="text-lg font-bold text-rose-700 mt-0.5">{summary.cancelled}</div>
          <div className="text-[10px] text-rose-600">With documented reason</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-[#64706E]">No-Show</div>
          <div className="text-lg font-bold text-slate-700 mt-0.5">{summary.noShow}</div>
          <div className="text-[10px] text-slate-500">Customer missed</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-amber-800">Blocked Slots</div>
          <div className="text-lg font-bold text-amber-700 mt-0.5">{summary.blocked}</div>
          <div className="text-[10px] text-amber-600">Stylist breaks / admin</div>
        </div>
      </div>

      {/* Control Navigation & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleNavigate('prev')}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Previous period"
          >
            <ChevronLeft className="w-4 h-4 text-[#17201F]" />
          </button>
          <button
            onClick={() => handleNavigate('today')}
            className="px-3.5 py-1.5 rounded-xl border border-[#E2E8E6] bg-white font-semibold text-xs text-[#17201F] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={() => handleNavigate('next')}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Next period"
          >
            <ChevronRight className="w-4 h-4 text-[#17201F]" />
          </button>

          <div className="ml-2">
            <span className="font-bold text-sm text-[#17201F] block">{formattedHeaderTitle}</span>
            <span className="text-[10px] text-[#64706E]">
              {view === 'day' ? 'Daily view' : view === 'week' ? '7-day overview' : 'Monthly calendar view'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Booking Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#64706E]">Status:</label>
            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No-Show</option>
            </select>
          </div>

          {/* Salon Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#64706E]">Salon:</label>
            <select
              value={salonId}
              onChange={(e) => handleSalonChange(e.target.value)}
              className="text-xs font-medium px-2.5 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] max-w-[220px] truncate focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Partner Salons ({salons.length})</option>
              {salons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.locality}, {s.city})
                </option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#64706E]">Stylist:</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="text-xs font-medium px-2.5 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] max-w-[180px] truncate focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Stylists ({availableStaff.length})</option>
              {availableStaff.length === 0 ? (
                <option disabled value="">
                  No stylists registered
                </option>
              ) : (
                availableStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.role})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. DAY VIEW                                                        */}
      {/* ------------------------------------------------------------------ */}
      {view === 'day' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          {/* Day View Header Strip */}
          <div className="p-4 bg-slate-50 border-b border-[#E2E8E6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-sm text-[#17201F] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#0F766E]" />
                <span>Schedule & Time Slot Availability for {formattedHeaderTitle}</span>
              </div>
              <div className="text-xs text-[#64706E] mt-0.5">
                {bookings.length} scheduled appointments • {blockedSlots.length} blocked slots
                {salonId !== 'ALL' && salons.find((s) => s.id === salonId) && (
                  <span> • {salons.find((s) => s.id === salonId)?.name}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                const defaultSalon = salonId !== 'ALL' ? salonId : salons[0]?.id || '';
                setBlockFormData({
                  salonId: defaultSalon,
                  staffId: staffId !== 'ALL' ? staffId : '',
                  date: currentDate,
                  startTime: '13:00',
                  endTime: '14:00',
                  reason: 'Stylist Lunch & Rest Break',
                });
                setIsBlockModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Block Custom Window</span>
            </button>
          </div>

          {/* Chronological Appointments and Hourly Slots */}
          <div className="divide-y divide-[#E2E8E6]">
            {dayScheduleHours.map((hour) => {
              const hourPrefix = hour.split(':')[0];
              const hourBookings = bookings.filter((b) => b.startTime.startsWith(hourPrefix));
              const hourBlocked = blockedSlots.filter((slot) => slot.startTime.startsWith(hourPrefix));

              return (
                <div key={hour} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-4 items-start">
                  {/* Time Column */}
                  <div className="w-24 shrink-0">
                    <span className="font-bold text-sm text-[#0F766E]">{hour}</span>
                    <span className="block text-[10px] text-[#64706E]">
                      {parseInt(hourPrefix) < 12 ? 'Morning' : parseInt(hourPrefix) < 17 ? 'Afternoon' : 'Evening'}
                    </span>
                  </div>

                  {/* Slot Items / Cards */}
                  <div className="flex-1 w-full space-y-2">
                    {/* Active Bookings at this hour */}
                    {hourBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="p-3.5 rounded-xl border border-[#E2E8E6] bg-white shadow-2xs hover:shadow-xs hover:border-[#0F766E] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[#CCFBF1]/40 text-[#0F766E] shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-[#17201F]">{b.customer.name}</span>
                              <span className="font-mono text-[10px] text-[#64706E] bg-slate-100 px-1.5 py-0.5 rounded">
                                {b.bookingNumber}
                              </span>
                              <StatusBadge status={b.bookingStatus} />
                            </div>
                            <div className="text-xs text-[#64706E] mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#17201F]">{b.service.name}</span>
                              <span>•</span>
                              <span>{b.salon.name} ({b.salon.locality})</span>
                              <span>•</span>
                              <span className="text-[#0F766E]">Stylist: {b.staff?.name || 'Unassigned'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-bold text-sm text-[#17201F]">₹{b.price}</div>
                            <div className="text-[10px] text-[#64706E]">{b.startTime} - {b.endTime}</div>
                          </div>
                          <span className="text-xs text-[#0F766E] font-semibold hover:underline">
                            Inspect Details &rarr;
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Blocked Slots at this hour */}
                    {hourBlocked.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 text-amber-900 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                          <div>
                            <span className="font-bold text-amber-900">
                              Blocked Window: {slot.startTime} – {slot.endTime}
                            </span>
                            <div className="text-[11px] text-amber-800 mt-0.5">
                              Reason: {slot.reason}
                              {slot.staffId && staff.find((st) => st.id === slot.staffId) && (
                                <span> • Stylist: {staff.find((st) => st.id === slot.staffId)?.name}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnblockSlot(slot.id)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold transition-colors cursor-pointer text-xs"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}

                    {/* Available Slot indicator when no booking/block exists */}
                    {hourBookings.length === 0 && hourBlocked.length === 0 && (
                      <div className="py-2.5 px-3 rounded-xl border border-dashed border-[#E2E8E6] bg-slate-50/50 flex items-center justify-between text-xs text-[#64706E]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-medium text-[#17201F]">Available Operating Slot</span>
                          <span className="text-[10px] text-slate-400">({hour} - {parseInt(hourPrefix) + 1}:00)</span>
                        </div>
                        <button
                          onClick={() => {
                            const defaultSalon = salonId !== 'ALL' ? salonId : salons[0]?.id || '';
                            const endH = String(parseInt(hourPrefix) + 1).padStart(2, '0') + ':00';
                            setBlockFormData({
                              salonId: defaultSalon,
                              staffId: staffId !== 'ALL' ? staffId : '',
                              date: currentDate,
                              startTime: hour,
                              endTime: endH,
                              reason: 'Stylist Break / Administrative Block',
                            });
                            setIsBlockModalOpen(true);
                          }}
                          className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Block Slot
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. WEEK VIEW                                                       */}
      {/* ------------------------------------------------------------------ */}
      {view === 'week' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          {/* Week Days Header Row */}
          <div className="grid grid-cols-7 border-b border-[#E2E8E6] bg-slate-50 text-center">
            {weekDays.map((dStr) => {
              const { year, month, day } = parseDateParts(dStr);
              const d = new Date(year, month, day);
              const isToday = dStr === '2026-10-13' || dStr === formatDateString(new Date());
              const isSelected = dStr === currentDate;

              return (
                <div
                  key={dStr}
                  onClick={() => {
                    setCurrentDate(dStr);
                    setView('day');
                  }}
                  className={`py-3 px-2 border-r last:border-r-0 border-[#E2E8E6] cursor-pointer hover:bg-slate-100 transition-colors ${
                    isToday ? 'bg-[#CCFBF1]/30' : isSelected ? 'bg-slate-100' : ''
                  }`}
                  title="Click to inspect Day View"
                >
                  <div className="text-[11px] font-semibold text-[#64706E] uppercase">
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                  <div
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-1 ${
                      isToday
                        ? 'bg-[#0F766E] text-white shadow-2xs'
                        : isSelected
                        ? 'bg-[#17201F] text-white'
                        : 'text-[#17201F]'
                    }`}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week Columns Grid */}
          <div className="grid grid-cols-7 divide-x divide-[#E2E8E6] min-h-[500px]">
            {weekDays.map((dStr) => {
              const dayBookings = bookings.filter((b) => b.appointmentDate === dStr);
              const dayBlocked = blockedSlots.filter((slot) => slot.date === dStr);

              return (
                <div
                  key={dStr}
                  className="p-2 space-y-2.5 bg-slate-50/20 max-h-[620px] overflow-y-auto"
                >
                  {/* Blocked slots on this day */}
                  {dayBlocked.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-[10px]"
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-700" />
                          {slot.startTime}–{slot.endTime}
                        </span>
                        <button
                          onClick={() => handleUnblockSlot(slot.id)}
                          className="hover:underline font-bold text-amber-800 cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="truncate text-amber-800 mt-0.5">{slot.reason}</div>
                    </div>
                  ))}

                  {/* Booking cards */}
                  {dayBookings.length === 0 && dayBlocked.length === 0 ? (
                    <div className="text-[11px] text-slate-400 text-center pt-10">
                      No appointments
                    </div>
                  ) : (
                    dayBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="bg-white p-2.5 rounded-xl border border-[#E2E8E6] shadow-2xs hover:shadow-xs hover:border-[#0F766E] transition-all text-xs cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#64706E] mb-1">
                          <span className="font-bold text-[#0F766E] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {b.startTime}
                          </span>
                          <span className="font-mono text-slate-400 text-[9px]">{b.bookingNumber}</span>
                        </div>
                        <div className="font-bold text-[#17201F] truncate text-xs">{b.customer.name}</div>
                        <div className="text-[11px] text-[#64706E] truncate">{b.service.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                          <span className="truncate">{b.salon.name.split(' ')[0]}</span>
                          <span className="font-bold text-[#17201F]">₹{b.price}</span>
                        </div>
                        <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-[#0F766E] truncate">
                            {b.staff?.name ? b.staff.name.split(' ')[0] : 'Unassigned'}
                          </span>
                          <StatusBadge status={b.bookingStatus} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. MONTH VIEW                                                      */}
      {/* ------------------------------------------------------------------ */}
      {view === 'month' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 border-b border-[#E2E8E6] bg-slate-50 text-center font-bold text-xs text-[#64706E] uppercase py-2.5">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#E2E8E6]">
            {monthGrid.map((cell) => {
              const dayBookings = bookings.filter((b) => b.appointmentDate === cell.dateStr);
              const dayBlocked = blockedSlots.filter((slot) => slot.date === cell.dateStr);

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    setCurrentDate(cell.dateStr);
                    setView('day');
                  }}
                  className={`min-h-[110px] p-2 transition-colors cursor-pointer hover:bg-slate-50/70 flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/40 text-slate-300'
                      : cell.isToday
                      ? 'bg-[#CCFBF1]/20'
                      : 'bg-white'
                  }`}
                  title="Click to inspect date in Day View"
                >
                  {/* Top: Day Number and Count Pill */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        cell.isToday
                          ? 'bg-[#0F766E] text-white shadow-2xs'
                          : cell.isCurrentMonth
                          ? 'text-[#17201F]'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {dayBookings.length} {dayBookings.length === 1 ? 'bk' : 'bks'}
                      </span>
                    )}
                  </div>

                  {/* Middle: Appointment Preview Chips */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayBookings.slice(0, 2).map((b) => (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                        className="text-[10px] p-1 rounded bg-slate-100 hover:bg-[#CCFBF1] text-[#17201F] truncate transition-colors font-medium flex items-center gap-1"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            b.bookingStatus === 'CONFIRMED'
                              ? 'bg-teal-500'
                              : b.bookingStatus === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : b.bookingStatus === 'CANCELLED'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="font-semibold">{b.startTime}</span>
                        <span className="truncate">{b.customer.name.split(' ')[0]}</span>
                      </div>
                    ))}

                    {dayBookings.length > 2 && (
                      <div className="text-[9px] text-[#0F766E] font-bold text-center">
                        +{dayBookings.length - 2} more
                      </div>
                    )}

                    {dayBlocked.length > 0 && (
                      <div className="text-[9px] text-amber-700 font-semibold bg-amber-50 px-1 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-amber-600" />
                        <span>{dayBlocked.length} blocked</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400 text-right">
                    {cell.isCurrentMonth ? 'inspect &rarr;' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. BOOKING DETAILS MODAL & STATUS INTERVENTIONS                     */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => {
          setSelectedBooking(null);
          setCancellationPrompt({ open: false, reason: '' });
        }}
        title={`Booking Record: ${selectedBooking?.bookingNumber}`}
        description="Verified database appointment details, financial breakdown, and administrative actions."
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
              <div>
                <span className="text-[#64706E]">Customer Information</span>
                <Link
                  href={`/customers/${selectedBooking.customerId}`}
                  className="font-bold text-[#0F766E] hover:underline flex items-center gap-1 mt-0.5 text-sm"
                >
                  {selectedBooking.customer.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <div className="text-[11px] text-[#64706E] flex items-center gap-1 mt-1">
                  <Phone className="w-2.5 h-2.5 text-slate-400" />
                  <span>{selectedBooking.customer.phone || 'Phone not available'}</span>
                </div>
                <div className="text-[11px] text-[#64706E] flex items-center gap-1 mt-0.5">
                  <Mail className="w-2.5 h-2.5 text-slate-400" />
                  <span className="truncate">{selectedBooking.customer.email || 'Email not available'}</span>
                </div>
              </div>

              <div>
                <span className="text-[#64706E]">Salon Partner</span>
                <Link
                  href={`/salons/${selectedBooking.salonId}`}
                  className="font-bold text-[#0F766E] hover:underline flex items-center gap-1 mt-0.5 text-sm"
                >
                  {selectedBooking.salon.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <div className="text-[11px] text-[#64706E] flex items-center gap-1 mt-1">
                  <MapPin className="w-2.5 h-2.5 text-[#0F766E]" />
                  <span>
                    {selectedBooking.salon.locality}, {selectedBooking.salon.city}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {selectedBooking.salon.address || 'Address on file'}
                </div>
              </div>
            </div>

            {/* Service & Schedule Details */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-[#E2E8E6]">
              <div>
                <span className="text-[#64706E]">Service Offered</span>
                <div className="font-bold text-[#17201F] text-sm mt-0.5">
                  {selectedBooking.service.name}
                </div>
                <div className="text-[11px] text-[#64706E] mt-0.5">
                  Category: {selectedBooking.service.category?.name || 'General Beauty'} • {selectedBooking.service.durationMin} mins
                </div>
              </div>

              <div>
                <span className="text-[#64706E]">Assigned Stylist</span>
                <div className="font-bold text-[#17201F] text-sm mt-0.5">
                  {selectedBooking.staff?.name || 'Unassigned Stylist'}
                </div>
                <div className="text-[11px] text-[#64706E] mt-0.5">
                  Role: {selectedBooking.staff?.role || 'Staff Member'}
                </div>
              </div>

              <div>
                <span className="text-[#64706E]">Appointment Schedule</span>
                <div className="font-bold text-[#17201F] mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>{selectedBooking.appointmentDate}</span>
                </div>
                <div className="text-[11px] text-[#0F766E] font-semibold mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {selectedBooking.startTime} – {selectedBooking.endTime}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#64706E]">Current Booking Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedBooking.bookingStatus} />
                </div>
                <div className="text-[10px] text-[#64706E] mt-1">
                  Created On:{' '}
                  {new Date(selectedBooking.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* Financial & Payment Breakdown */}
            <div className="p-3 bg-[#CCFBF1]/20 rounded-xl border border-[#99F6E4]/50 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#64706E]">Total Appointment Charge:</span>
                <span className="font-bold text-[#17201F] text-sm">₹{selectedBooking.price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64706E]">
                  Platform Commission ({(selectedBooking.commissionRate * 100).toFixed(0)}%):
                </span>
                <span className="font-bold text-[#0F766E]">₹{selectedBooking.commissionAmount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64706E]">Salon Partner Net Payout:</span>
                <span className="font-bold text-emerald-800">₹{selectedBooking.salonPayoutAmount}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-[#99F6E4]/40">
                <span className="text-[#64706E]">Payment Status & Method:</span>
                <span className="font-semibold text-[#17201F]">
                  {selectedBooking.paymentStatus} via {selectedBooking.payment?.paymentMethod || 'UPI'}
                </span>
              </div>
              {selectedBooking.payment?.transactionNumber && (
                <div className="text-[10px] text-slate-500 font-mono">
                  Ref: {selectedBooking.payment.transactionNumber}
                </div>
              )}
            </div>

            {/* Customer Notes */}
            {selectedBooking.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
                <span className="font-bold text-[#17201F] block mb-0.5">Customer Notes & Requests:</span>
                <p className="text-[#64706E]">{selectedBooking.notes}</p>
              </div>
            )}

            {/* Cancellation Notice if Cancelled */}
            {selectedBooking.cancellationReason && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                <span className="font-bold block mb-0.5">Cancellation Audit Record:</span>
                <p>{selectedBooking.cancellationReason}</p>
                {selectedBooking.cancelledBy && (
                  <span className="text-[10px] text-rose-600 block mt-1">
                    Recorded By: {selectedBooking.cancelledBy}
                  </span>
                )}
              </div>
            )}

            {/* Cancellation Reason Prompt when Administrator clicks Cancel */}
            {cancellationPrompt.open && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                <label className="font-bold text-amber-900 block">
                  Mandatory Administrative Cancellation Reason:
                </label>
                <textarea
                  rows={2}
                  value={cancellationPrompt.reason}
                  onChange={(e) =>
                    setCancellationPrompt({ ...cancellationPrompt, reason: e.target.value })
                  }
                  placeholder="e.g. Customer requested rescheduling via telephone or emergency salon closure..."
                  className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setCancellationPrompt({ open: false, reason: '' })}
                    className="px-3 py-1.5 border border-[#E2E8E6] bg-white rounded-lg text-xs cursor-pointer"
                  >
                    Abort
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateBookingStatus('CANCELLED', cancellationPrompt.reason)
                    }
                    disabled={statusActionLoading || !cancellationPrompt.reason.trim()}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    {statusActionLoading ? 'Saving...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E6] flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/bookings?search=${selectedBooking.bookingNumber}`}
                  className="px-3 py-1.5 border border-[#E2E8E6] rounded-lg text-xs font-medium text-[#0F766E] hover:bg-slate-50 transition-colors"
                >
                  View in Registry
                </Link>
              </div>

              {/* Status Actions */}
              <div className="flex items-center gap-2">
                {selectedBooking.bookingStatus === 'PENDING' && (
                  <button
                    onClick={() => handleUpdateBookingStatus('CONFIRMED')}
                    disabled={statusActionLoading}
                    className="px-3 py-1.5 bg-[#0F766E] text-white rounded-lg font-semibold hover:bg-[#115E59] cursor-pointer"
                  >
                    Confirm Booking
                  </button>
                )}

                {selectedBooking.bookingStatus === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => handleUpdateBookingStatus('COMPLETED')}
                      disabled={statusActionLoading}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 cursor-pointer"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus('NO_SHOW')}
                      disabled={statusActionLoading}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      No-Show
                    </button>
                    <button
                      onClick={() => setCancellationPrompt({ open: true, reason: '' })}
                      disabled={statusActionLoading}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 cursor-pointer"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setCancellationPrompt({ open: false, reason: '' });
                  }}
                  className="px-4 py-1.5 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* 5. BLOCK TIME SLOT MODAL                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Block Calendar Time Window"
        description="Prevent customer bookings for stylist rest periods, staff meetings, or scheduled salon maintenance."
      >
        <form onSubmit={handleBlockSlotSubmit} className="space-y-4 text-xs">
          {blockError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {blockError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Target Salon Partner</label>
            <select
              required
              value={blockFormData.salonId}
              onChange={(e) => setBlockFormData({ ...blockFormData, salonId: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg bg-white text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="">Select a salon partner</option>
              {salons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.locality}, {s.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Appointment Date</label>
              <input
                type="date"
                required
                value={blockFormData.date}
                onChange={(e) => setBlockFormData({ ...blockFormData, date: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                Assigned Stylist (Optional)
              </label>
              <select
                value={blockFormData.staffId}
                onChange={(e) => setBlockFormData({ ...blockFormData, staffId: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg bg-white text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="">All Stylists at Salon</option>
                {staff
                  .filter((st) => !blockFormData.salonId || st.salonId === blockFormData.salonId)
                  .map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Start Time (HH:mm)</label>
              <input
                type="time"
                required
                value={blockFormData.startTime}
                onChange={(e) => setBlockFormData({ ...blockFormData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">End Time (HH:mm)</label>
              <input
                type="time"
                required
                value={blockFormData.endTime}
                onChange={(e) => setBlockFormData({ ...blockFormData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Reason for Blocking</label>
            <input
              type="text"
              required
              value={blockFormData.reason}
              onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
              placeholder="e.g. Stylist Lunch Break, Private VIP booking, Maintenance"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setIsBlockModalOpen(false)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={blockLoading}
              className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
            >
              {blockLoading ? 'Validating & Saving...' : 'Confirm Slot Block'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Calendar & Slots' }]}>
          <div className="py-24 text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading appointment calendar...</p>
          </div>
        </AdminShell>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
