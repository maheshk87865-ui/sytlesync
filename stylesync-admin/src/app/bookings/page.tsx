'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  CalendarCheck,
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Scissors,
  CreditCard,
  AlertCircle,
  Loader2,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
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
  customer: { id: string; name: string; phone: string; email: string };
  salon: { id: string; name: string; locality: string; city: string };
  service: { id: string; name: string; durationMin: number };
  staff?: { id: string; name: string; role: string };
  payment?: { transactionNumber: string; amount: number; paymentMethod: string; status: string };
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [city, setCity] = useState('ALL');
  const [bookingStatus, setBookingStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Selected Booking for Detail & Status Interventions
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusUpdateState, setStatusUpdateState] = useState({
    newStatus: '',
    cancellationReason: '',
    notes: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        bookingStatus,
        paymentStatus,
        dateFrom,
        dateTo,
      });
      if (city && city !== 'ALL') {
        query.set('city', city);
      }
      const res = await fetch(`/api/bookings?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, city, bookingStatus, paymentStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const openBookingModal = (b: Booking) => {
    setSelectedBooking(b);
    setStatusUpdateState({
      newStatus: b.bookingStatus,
      cancellationReason: b.cancellationReason || '',
      notes: b.notes || '',
    });
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: statusUpdateState.notes }),
      });
      if (res.ok) {
        setToast(`Administrative notes saved for ${selectedBooking.bookingNumber}`);
        setTimeout(() => setToast(null), 3000);
        setSelectedBooking((prev) => (prev ? { ...prev, notes: statusUpdateState.notes } : null));
        fetchBookings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedBooking) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingStatus: status,
          cancellationReason: status === 'CANCELLED' ? statusUpdateState.cancellationReason || 'Cancelled by administrator.' : null,
          notes: statusUpdateState.notes || undefined,
        }),
      });

      if (res.ok) {
        setToast(`Booking ${selectedBooking.bookingNumber} transitioned to ${status}`);
        setTimeout(() => setToast(null), 3500);
        setSelectedBooking(null);
        setStatusUpdateState({ newStatus: '', cancellationReason: '', notes: '' });
        fetchBookings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Bookings' }]}
      title="Platform-Wide Bookings"
      description="Inspect customer appointment reservations, status transitions, commission splits, and payments."
      actions={
        <button
          onClick={fetchBookings}
          className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Refresh Bookings"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Toast Feedback Banner */}
      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 text-xs">
        {[
          { key: 'ALL', label: 'All Bookings' },
          { key: 'CONFIRMED', label: 'Confirmed' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'CANCELLED', label: 'Cancelled' },
          { key: 'NO_SHOW', label: 'No-Show' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setBookingStatus(tab.key);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              bookingStatus === tab.key
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'bg-white border border-[#E2E8E6] text-[#64706E] hover:bg-slate-50 hover:text-[#17201F]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Comprehensive Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search booking number (BK-0001), customer, salon..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-xs text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Territories (National)</option>
              <option value="Srinagar">Srinagar</option>
              <option value="Jammu">Jammu</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Jaipur">Jaipur</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Kolkata">Kolkata</option>
            </select>

            <select
              value={bookingStatus}
              onChange={(e) => {
                setBookingStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Booking Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No-Show</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending Payment</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#E2E8E6] text-xs text-[#64706E]">
          <span className="font-semibold text-[#17201F]">Appointment Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-2.5 py-1 bg-slate-50 border border-[#E2E8E6] rounded-lg text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-2.5 py-1 bg-slate-50 border border-[#E2E8E6] rounded-lg text-xs"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="text-rose-600 hover:underline text-[11px] font-semibold cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Salon Partner</th>
                <th className="py-3 px-4">Service & Stylist</th>
                <th className="py-3 px-4">Slot Time</th>
                <th className="py-3 px-4">Financial Split</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying bookings across Srinagar partner network...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F766E]">
                      {b.bookingNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/customers/${b.customerId}`}
                        className="font-semibold text-[#0F766E] hover:underline"
                        title="View customer profile"
                      >
                        {b.customer.name}
                      </Link>
                      <div className="text-[10px] text-[#64706E]">{b.customer.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/salons/${b.salonId}`}
                        className="font-semibold text-[#0F766E] hover:underline"
                        title="View salon profile"
                      >
                        {b.salon.name}
                      </Link>
                      <div className="text-[10px] text-[#64706E]">{b.salon.locality}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#17201F]">{b.service.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {b.staff?.name ? `Stylist: ${b.staff.name}` : 'Unassigned'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#17201F]">{b.appointmentDate}</div>
                      <div className="text-[10px] text-[#64706E]">
                        {b.startTime} - {b.endTime}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#17201F]">₹{b.price}</div>
                      <div className="text-[10px] text-[#0F766E]">
                        Fee ({(b.commissionRate * 100).toFixed(0)}%): ₹{b.commissionAmount}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div>
                        <StatusBadge status={b.bookingStatus} />
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-500">
                          Pay: {b.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openBookingModal(b)}
                        className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/40 font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        Inspect / Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-[#E2E8E6] bg-slate-50 flex items-center justify-between text-xs text-[#64706E]">
          <div>
            Showing{' '}
            <span className="font-semibold text-[#17201F]">
              {bookings.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> bookings
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
              className="p-1 rounded-lg border border-[#E2E8E6] bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-[#17201F]">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 rounded-lg border border-[#E2E8E6] bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Booking Detail & Status Intervention Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Booking Record: ${selectedBooking?.bookingNumber}`}
        description="Review customer reservation details, edit internal notes, and execute administrative interventions."
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
              <div>
                <span className="text-[#64706E]">Customer</span>
                <Link
                  href={`/customers/${selectedBooking.customerId}`}
                  className="font-bold text-[#0F766E] hover:underline flex items-center gap-1 mt-0.5"
                >
                  {selectedBooking.customer.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <div className="text-[10px] text-[#64706E]">{selectedBooking.customer.phone}</div>
              </div>
              <div>
                <span className="text-[#64706E]">Salon Partner</span>
                <Link
                  href={`/salons/${selectedBooking.salonId}`}
                  className="font-bold text-[#0F766E] hover:underline flex items-center gap-1 mt-0.5"
                >
                  {selectedBooking.salon.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <div className="text-[10px] text-[#64706E]">{selectedBooking.salon.locality}, Srinagar</div>
              </div>
              <div>
                <span className="text-[#64706E]">Service</span>
                <div className="font-bold text-[#17201F]">{selectedBooking.service.name}</div>
                <div className="text-[10px] text-[#64706E]">{selectedBooking.service.durationMin} mins duration</div>
              </div>
              <div>
                <span className="text-[#64706E]">Assigned Stylist</span>
                <div className="font-bold text-[#17201F]">{selectedBooking.staff?.name || 'Unassigned'}</div>
                {selectedBooking.staff?.role && (
                  <div className="text-[10px] text-[#64706E]">{selectedBooking.staff.role}</div>
                )}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 bg-[#CCFBF1]/20 rounded-xl border border-[#99F6E4]/50 space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64706E]">Gross Appointment Price:</span>
                <span className="font-bold text-[#17201F]">₹{selectedBooking.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64706E]">
                  Platform Commission ({(selectedBooking.commissionRate * 100).toFixed(0)}%):
                </span>
                <span className="font-bold text-[#0F766E]">₹{selectedBooking.commissionAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64706E]">Salon Partner Net Payout:</span>
                <span className="font-bold text-emerald-800">₹{selectedBooking.salonPayoutAmount}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#99F6E4]/40">
                <span className="text-[#64706E]">Payment Status:</span>
                <span className="font-semibold text-[#17201F]">{selectedBooking.paymentStatus}</span>
              </div>
            </div>

            {selectedBooking.cancellationReason && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                <span className="font-semibold">Cancellation Note: </span>
                {selectedBooking.cancellationReason} {selectedBooking.cancelledBy ? `(${selectedBooking.cancelledBy})` : ''}
              </div>
            )}

            {/* Internal Administrative Notes */}
            <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#17201F] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#0F766E]" />
                  Administrative Note (Internal)
                </label>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSaveNotes}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-[10px] cursor-pointer disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
              <input
                type="text"
                value={statusUpdateState.notes}
                onChange={(e) =>
                  setStatusUpdateState({ ...statusUpdateState, notes: e.target.value })
                }
                placeholder="Add private administrative memo or operational update..."
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8E6] rounded-lg text-xs text-[#17201F]"
              />
            </div>

            {/* Administrative Status Transitions */}
            <div className="pt-3 border-t border-[#E2E8E6]">
              <span className="block font-bold text-[#17201F] mb-2">
                Execute Administrative Intervention:
              </span>

              {selectedBooking.bookingStatus !== 'CANCELLED' && (
                <div className="mb-3">
                  <label className="block text-[11px] text-[#64706E] mb-1 font-medium">
                    Cancellation Reason (Required if cancelling):
                  </label>
                  <input
                    type="text"
                    value={statusUpdateState.cancellationReason}
                    onChange={(e) =>
                      setStatusUpdateState({ ...statusUpdateState, cancellationReason: e.target.value })
                    }
                    placeholder="e.g. Customer requested schedule shift; salon emergency..."
                    className="w-full px-3 py-1.5 border border-[#E2E8E6] rounded-lg bg-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {selectedBooking.bookingStatus === 'PENDING' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('CONFIRMED')}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 cursor-pointer shadow-2xs"
                  >
                    Confirm Appointment
                  </button>
                )}

                {selectedBooking.bookingStatus !== 'COMPLETED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('COMPLETED')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer shadow-2xs"
                  >
                    Mark Completed
                  </button>
                )}

                {selectedBooking.bookingStatus !== 'CANCELLED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('CANCELLED')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer shadow-2xs"
                  >
                    Cancel Appointment
                  </button>
                )}

                {selectedBooking.bookingStatus === 'CANCELLED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('CONFIRMED')}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 cursor-pointer shadow-2xs"
                  >
                    Re-activate Appointment
                  </button>
                )}

                {selectedBooking.bookingStatus !== 'NO_SHOW' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('NO_SHOW')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer shadow-2xs"
                  >
                    Mark No-Show
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Bookings' }]}>
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs text-slate-500">Loading bookings dashboard...</p>
          </div>
        </AdminShell>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}
