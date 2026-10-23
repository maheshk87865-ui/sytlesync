'use client';

import React, { useState, useEffect, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  User,
  Calendar,
  CreditCard,
  Star,
  HelpCircle,
  MapPin,
  Mail,
  Phone,
  Clock,
  RotateCw,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

function CustomerDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'payments' | 'reviews' | 'tickets'>('bookings');

  // Status Action Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        router.push('/customers');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleToggleStatus = async () => {
    if (!customer) return;
    setStatusLoading(true);
    const newStatus = customer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setIsStatusModalOpen(false);
        fetchCustomer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading || !customer) {
    return (
      <AdminShell breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'Loading...' }]}>
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
          <p className="text-sm text-[#64706E]">Loading customer profile and history...</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: customer.name }]}
      title={customer.name}
      description={`Customer ID: ${customer.id} • Registered in ${customer.locality}, ${customer.city}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/customers"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E6] bg-white rounded-xl text-xs font-semibold text-[#64706E] hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Customers
          </Link>
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer ${
              customer.status === 'ACTIVE'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {customer.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
          </button>
        </div>
      }
    >
      {/* Top Profile Card */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8E6] shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              {customer.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-[#17201F]">{customer.name}</h2>
                <StatusBadge status={customer.status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#64706E] mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {customer.locality}, {customer.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Member since{' '}
                  {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t sm:border-t-0 sm:border-l border-[#E2E8E6] pt-4 sm:pt-0 sm:pl-6">
            <div>
              <div className="text-[11px] text-[#64706E]">Total Bookings</div>
              <div className="text-lg font-bold text-[#0F766E]">{customer.bookingCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64706E]">Total Spent</div>
              <div className="text-lg font-bold text-[#17201F]">
                ₹{customer.totalSpent?.toLocaleString('en-IN') || 0}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64706E]">Reviews Left</div>
              <div className="text-lg font-bold text-amber-600">{customer.reviews?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#E2E8E6] mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'bookings' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Bookings History ({customer.bookings?.length || 0})
          {activeTab === 'bookings' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'payments' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Payments ({customer.payments?.length || 0})
          {activeTab === 'payments' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'reviews' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Reviews ({customer.reviews?.length || 0})
          {activeTab === 'reviews' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'tickets' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Support Tickets ({customer.supportTickets?.length || 0})
          {activeTab === 'tickets' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Salon & Locality</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Stylist</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E6]">
                {customer.bookings?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No appointments recorded for this customer.
                    </td>
                  </tr>
                ) : (
                  customer.bookings?.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#0F766E]">
                        {b.bookingNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#17201F]">{b.salon.name}</div>
                        <div className="text-[10px] text-[#64706E]">{b.salon.locality}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#17201F]">{b.service.name}</td>
                      <td className="py-3 px-4 text-[#64706E]">{b.staff?.name || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <div>{b.appointmentDate}</div>
                        <div className="text-[10px] text-[#64706E]">{b.startTime} - {b.endTime}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#17201F]">₹{b.price}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={b.bookingStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Provider Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E6]">
                {customer.payments?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  customer.payments?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#17201F]">
                        {p.transactionNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0F766E]">₹{p.amount}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.providerRef || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-[#64706E]">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {customer.reviews?.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-[#E2E8E6]">
              Customer has not published any salon reviews yet.
            </div>
          ) : (
            customer.reviews?.map((r: any) => (
              <div key={r.id} className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#17201F]">{r.salon.name}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{r.rating}.0</span>
                    </div>
                  </div>
                  <StatusBadge status={r.moderationStatus} />
                </div>
                <p className="text-xs text-[#17201F] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  &ldquo;{r.comment}&rdquo;
                </p>
                <div className="mt-2 text-[10px] text-[#64706E]">
                  Posted on {new Date(r.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-3">
          {customer.supportTickets?.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-[#E2E8E6]">
              No customer inquiries or support tickets submitted.
            </div>
          ) : (
            customer.supportTickets?.map((t: any) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-xs text-[#0F766E]">{t.ticketNumber}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-xs font-semibold text-[#17201F] mt-1">{t.subject}</div>
                  <div className="text-[11px] text-[#64706E] mt-0.5 line-clamp-1">{t.description}</div>
                </div>
                <Link
                  href={`/support?search=${encodeURIComponent(t.ticketNumber)}`}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8E6] text-xs font-semibold text-[#0F766E] hover:bg-[#CCFBF1]/40"
                >
                  Open Ticket
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={customer.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
        description={`Customer: ${customer.name} (${customer.email})`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#64706E]">
            {customer.status === 'ACTIVE'
              ? 'Are you sure you want to suspend this customer? They will not be able to book any new appointments until reactivated.'
              : 'Reactivating this customer will immediately allow them to book appointments in Srinagar.'}
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className={`px-4 py-2 font-semibold text-white rounded-lg cursor-pointer ${
                customer.status === 'ACTIVE'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {statusLoading ? 'Updating...' : 'Confirm Action'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}

export default function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'Loading...' }]}>
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs text-slate-500">Loading customer profile...</p>
          </div>
        </AdminShell>
      }
    >
      <CustomerDetailContent {...props} />
    </Suspense>
  );
}
