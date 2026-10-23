'use client';

import React, { useState, useEffect, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  Building2,
  MapPin,
  Star,
  Users,
  Scissors,
  Calendar,
  CreditCard,
  Clock,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCw,
  Loader2,
  ChevronLeft,
  DollarSign,
  HelpCircle,
} from 'lucide-react';

function SalonDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [salon, setSalon] = useState<any>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'staff' | 'bookings' | 'reviews' | 'hours'>('services');

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
    action: 'APPROVE' | 'REJECT' | 'SUSPEND' | null;
  }>({ action: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSalon = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salons/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data.salon);
        setFinancials(data.financials);
      } else {
        router.push('/salons');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchSalon();
  }, [fetchSalon]);

  const handleDecision = async () => {
    if (!decisionModal.action || !salon) return;
    setActionLoading(true);

    let newStatus = 'APPROVED';
    if (decisionModal.action === 'REJECT') newStatus = 'REJECTED';
    if (decisionModal.action === 'SUSPEND') newStatus = 'SUSPENDED';

    try {
      const res = await fetch(`/api/salons/${salon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationStatus: newStatus,
          rejectionReason: decisionModal.action === 'REJECT' ? rejectionReason : null,
        }),
      });

      if (res.ok) {
        setDecisionModal({ action: null });
        setRejectionReason('');
        fetchSalon();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOperational = async () => {
    if (!salon) return;
    const newOp = salon.operationalStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const res = await fetch(`/api/salons/${salon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationalStatus: newOp }),
      });
      if (res.ok) fetchSalon();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !salon) {
    return (
      <AdminShell breadcrumbs={[{ label: 'Salons', href: '/salons' }, { label: 'Loading...' }]}>
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
          <p className="text-sm text-[#64706E]">Loading salon profile and operational records...</p>
        </div>
      </AdminShell>
    );
  }

  const hours = salon.businessHoursJson ? JSON.parse(salon.businessHoursJson) : {};

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Salons', href: '/salons' }, { label: salon.name }]}
      title={salon.name}
      description={`Salon ID: ${salon.id} • Registered in ${salon.locality}, ${salon.city}`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/salons"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E6] bg-white rounded-xl text-xs font-semibold text-[#64706E] hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Salons
          </Link>

          <button
            onClick={handleToggleOperational}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              salon.operationalStatus === 'OPEN'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}
          >
            Operational: {salon.operationalStatus} (Toggle)
          </button>

          {salon.applicationStatus === 'PENDING' && (
            <>
              <button
                onClick={() => setDecisionModal({ action: 'APPROVE' })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Approve Application
              </button>
              <button
                onClick={() => setDecisionModal({ action: 'REJECT' })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Reject Application
              </button>
            </>
          )}

          {salon.applicationStatus === 'APPROVED' && (
            <button
              onClick={() => setDecisionModal({ action: 'SUSPEND' })}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-300 text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
            >
              Suspend Salon
            </button>
          )}

          {salon.applicationStatus === 'SUSPENDED' && (
            <button
              onClick={() => setDecisionModal({ action: 'APPROVE' })}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Reinstate Salon
            </button>
          )}
        </div>
      }
    >
      {/* Top Profile Card */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8E6] shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              <Building2 className="w-8 h-8 text-[#0F766E]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-[#17201F]">{salon.name}</h2>
                <StatusBadge status={salon.applicationStatus} />
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    salon.operationalStatus === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {salon.operationalStatus}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#64706E] mt-2">
                <span className="flex items-center gap-1 font-medium text-[#17201F]">
                  Owner: {salon.ownerName}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {salon.ownerEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {salon.ownerPhone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {salon.address}, {salon.locality}, {salon.city}
                </span>
              </div>

              {salon.rejectionReason && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <span className="font-semibold">Rejection Note: </span>
                  {salon.rejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-[#E2E8E6] pt-4 md:pt-0 md:pl-6 text-xs">
            <div>
              <div className="text-[#64706E]">Gross Sales</div>
              <div className="text-lg font-bold text-[#17201F]">
                ₹{(financials?.grossSales || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[#64706E]">Commission Paid</div>
              <div className="text-lg font-bold text-[#0F766E]">
                ₹{(financials?.totalCommissionPaid || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[#64706E]">Net Payout Due</div>
              <div className="text-lg font-bold text-emerald-700">
                ₹{(financials?.netPayoutEarned || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8E6] mb-6 flex gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'services' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Services Offered ({salon.salonServices?.length || 0})
          {activeTab === 'services' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'staff' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Stylists & Staff ({salon.staff?.length || 0})
          {activeTab === 'staff' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'bookings' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Recent Bookings ({salon.bookings?.length || 0})
          {activeTab === 'bookings' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'reviews' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Reviews ({salon.reviews?.length || 0})
          {activeTab === 'reviews' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'hours' ? 'text-[#0F766E]' : 'text-[#64706E] hover:text-[#17201F]'
          }`}
        >
          Operating Hours
          {activeTab === 'hours' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
          )}
        </button>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
                <tr>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Custom Salon Price</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Target Audience</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E6]">
                {salon.salonServices?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No services configured for this salon.
                    </td>
                  </tr>
                ) : (
                  salon.salonServices?.map((ss: any) => (
                    <tr key={ss.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#17201F]">
                        {ss.globalService.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                          {ss.globalService.category.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0F766E]">₹{ss.customPrice}</td>
                      <td className="py-3 px-4 text-[#64706E]">{ss.customDurationMin} mins</td>
                      <td className="py-3 px-4 text-[#64706E]">{ss.globalService.genderTarget}</td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 font-semibold">Available</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salon.staff?.length === 0 ? (
            <div className="col-span-3 p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-[#E2E8E6]">
              No stylists registered yet.
            </div>
          ) : (
            salon.staff?.map((st: any) => (
              <div key={st.id} className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center font-bold text-sm">
                    {st.name[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#17201F]">{st.name}</h4>
                    <p className="text-xs text-[#0F766E] font-medium">{st.role}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E2E8E6] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{st.rating}</span>
                  </div>
                  <span className="text-emerald-700 font-medium">Available</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Stylist</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E6]">
                {salon.bookings?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#0F766E]">
                      {b.bookingNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#17201F]">{b.customer.name}</td>
                    <td className="py-3 px-4">{b.service.name}</td>
                    <td className="py-3 px-4 text-[#64706E]">{b.staff?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4">
                      {b.appointmentDate} ({b.startTime})
                    </td>
                    <td className="py-3 px-4 font-bold text-[#17201F]">₹{b.price}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {salon.reviews?.map((r: any) => (
            <div key={r.id} className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#17201F]">{r.customer.name}</span>
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
            </div>
          ))}
        </div>
      )}

      {/* Hours Tab */}
      {activeTab === 'hours' && (
        <div className="bg-white rounded-xl p-6 border border-[#E2E8E6] shadow-xs max-w-xl">
          <h3 className="text-sm font-bold text-[#17201F] mb-4">Official Business Hours</h3>
          <div className="divide-y divide-[#E2E8E6] text-xs">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => (
              <div key={d} className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-[#17201F] capitalize">{d}</span>
                <span className="text-[#64706E]">
                  {hours[d] ? `${hours[d].open} - ${hours[d].close}` : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Modal */}
      <Modal
        isOpen={!!decisionModal.action}
        onClose={() => setDecisionModal({ action: null })}
        title={
          decisionModal.action === 'APPROVE'
            ? 'Approve Partner Salon'
            : decisionModal.action === 'REJECT'
            ? 'Reject Partner Application'
            : 'Suspend Salon'
        }
        description={`Target salon: ${salon.name}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#64706E]">
            {decisionModal.action === 'APPROVE' &&
              'Approving will immediately grant verification and allow appointments to be booked.'}
            {decisionModal.action === 'REJECT' &&
              'Please document the rationale for rejecting this partner application.'}
            {decisionModal.action === 'SUSPEND' &&
              'Suspending will disable new bookings while preserving historical records.'}
          </p>

          {decisionModal.action === 'REJECT' && (
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                Rejection Reason (Required)
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full p-2.5 border border-[#E2E8E6] rounded-lg"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              onClick={() => setDecisionModal({ action: null })}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDecision}
              disabled={actionLoading || (decisionModal.action === 'REJECT' && !rejectionReason.trim())}
              className={`px-4 py-2 font-semibold text-white rounded-lg cursor-pointer disabled:opacity-50 ${
                decisionModal.action === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : decisionModal.action === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {actionLoading ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}

export default function SalonDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Salons', href: '/salons' }, { label: 'Loading...' }]}>
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs text-slate-500">Loading salon details...</p>
          </div>
        </AdminShell>
      }
    >
      <SalonDetailContent {...props} />
    </Suspense>
  );
}
