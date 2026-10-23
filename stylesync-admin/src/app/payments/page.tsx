'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  CreditCard,
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  RotateCcw,
  AlertCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';

interface Payment {
  id: string;
  transactionNumber: string;
  bookingId: string;
  amount: number;
  commissionAmount: number;
  salonPayoutAmount: number;
  paymentMethod: string;
  providerRef?: string;
  status: string;
  paidAt: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  salon: { id: string; name: string; locality: string };
  booking: { id: string; bookingNumber: string; appointmentDate: string };
  refunds?: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [method, setMethod] = useState('ALL');

  // Refund Modal State
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
        method,
      });
      const res = await fetch(`/api/payments?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setSummary(data.summary);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status, method]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openRefundModal = (p: Payment) => {
    const alreadyRefunded = (p.refunds || []).reduce((sum, r) => sum + r.amount, 0);
    const remaining = p.amount - alreadyRefunded;
    setRefundPayment(p);
    setRefundAmount(remaining.toString());
    setRefundReason('');
    setRefundError('');
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPayment) return;
    setRefundLoading(true);
    setRefundError('');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: refundPayment.id,
          amount: parseFloat(refundAmount),
          reason: refundReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process refund.');

      setRefundPayment(null);
      fetchPayments();
    } catch (err: any) {
      setRefundError(err.message);
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Payments & Finance' }]}
      title="Payments & Financial Administration"
      description="Supervise transaction settlements, platform commissions (7% new / 2% repeat), payouts, and refund safeguards."
      actions={
        <button
          onClick={fetchPayments}
          className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          title="Refresh Financial Records"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
        </button>
      }
    >
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Total Collected Payments</span>
          <div className="text-2xl font-bold text-[#17201F] mt-1">
            ₹{(summary?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Verified customer receipts</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Platform Commission Earned</span>
          <div className="text-2xl font-bold text-[#0F766E] mt-1">
            ₹{(summary?.totalCommission || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#0F766E] font-medium">7% first / 2% repeat bookings</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Salon Partner Payables</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{(summary?.totalSalonPayable || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#64706E]">Net payable to Srinagar partners</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Total Processed Refunds</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            ₹{(summary?.totalRefunds || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">Safeguarded cancellation payouts</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transaction ID, booking number, customer..."
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Methods</option>
            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="NETBANKING">Net Banking</option>
            <option value="CASH">Cash at Salon</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Salon Partner</th>
                <th className="py-3 px-4">Gross Amount</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying StyleSync financial ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No transactions found for the specified filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#17201F]">
                      {p.transactionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0F766E]">
                      {p.booking.bookingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#17201F]">{p.customer.name}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#17201F]">{p.salon.name}</div>
                      <div className="text-[10px] text-[#64706E]">{p.salon.locality}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#17201F]">₹{p.amount}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F766E]">
                      ₹{p.commissionAmount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.status === 'SUCCESS' && (
                        <button
                          onClick={() => openRefundModal(p)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                        >
                          Issue Refund
                        </button>
                      )}
                      {p.status === 'REFUNDED' && (
                        <span className="text-[11px] text-slate-400 font-medium">Refunded</span>
                      )}
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
              {payments.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> payments
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

      {/* Validated Refund Safeguard Modal */}
      <Modal
        isOpen={!!refundPayment}
        onClose={() => setRefundPayment(null)}
        title={`Process Refund: ${refundPayment?.transactionNumber}`}
        description="Verify details before executing financial reversal to customer account."
      >
        {refundPayment && (
          <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
            {refundError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {refundError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64706E]">Original Transaction Amount:</span>
                <span className="font-bold text-[#17201F]">₹{refundPayment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64706E]">Customer:</span>
                <span className="font-semibold text-[#17201F]">{refundPayment.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64706E]">Salon Partner:</span>
                <span className="font-semibold text-[#17201F]">{refundPayment.salon.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64706E]">Associated Booking:</span>
                <span className="font-mono text-[#0F766E]">{refundPayment.booking.bookingNumber}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                Refund Amount (INR ₹)
              </label>
              <input
                type="number"
                required
                max={refundPayment.amount}
                min="1"
                step="1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                Administrative Justification / Reason (Required)
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Approved cancellation 3 hours prior to slot as per Srinagar platform policy..."
                className="w-full p-2.5 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
              <button
                type="button"
                onClick={() => setRefundPayment(null)}
                className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundLoading || !refundReason.trim()}
                className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {refundLoading ? 'Processing Safeguarded Refund...' : 'Confirm Financial Refund'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AdminShell>
  );
}
