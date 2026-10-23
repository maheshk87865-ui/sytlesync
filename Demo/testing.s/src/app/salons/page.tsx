'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  Building2,
  Search,
  Plus,
  RotateCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Star,
  Clock,
  Phone,
  Mail,
  Scissors,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Salon {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  address: string;
  locality: string;
  city: string;
  rating: number;
  reviewCount: number;
  applicationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  operationalStatus: 'OPEN' | 'CLOSED';
  verificationStatus: string;
  rejectionReason?: string;
  createdAt: string;
  _count?: { staff: number; bookings: number; reviews: number; salonServices: number };
}

const CITY_LOCALITY_MAP: Record<string, string[]> = {
  Srinagar: ['Lal Chowk', 'Rajbagh', 'Karan Nagar', 'Sanat Nagar', 'Hazratbal', 'Bemina', 'Soura', 'Dalgate', 'Nishat', 'Jawahar Nagar'],
  Jammu: ['Gandhi Nagar', 'Bahu Plaza', 'Channi Himmat', 'Jewel Chowk'],
  'Delhi NCR': ['Connaught Place', 'South Extension', 'Hauz Khas', 'Saket', 'DLF Cyber City', 'Noida Sector 18'],
  Mumbai: ['Bandra West', 'Juhu', 'Colaba', 'Andheri West', 'Powai', 'Lower Parel'],
  Bengaluru: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'MG Road', 'JP Nagar'],
  Chandigarh: ['Sector 17', 'Sector 35', 'Mohali Phase 7'],
  Jaipur: ['C-Scheme', 'Malviya Nagar', 'Raja Park'],
  Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli'],
  Kolkata: ['Park Street', 'Salt Lake', 'Ballygunge'],
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function SalonsContent() {
  const searchParams = useSearchParams();
  const initialAppStatus = searchParams.get('applicationStatus') || 'ALL';

  const [salons, setSalons] = useState<Salon[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(initialAppStatus);
  const [operationalStatus, setOperationalStatus] = useState('ALL');
  const [city, setCity] = useState('ALL');
  const [locality, setLocality] = useState('ALL');

  // Application Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
    salon: Salon | null;
    action: 'APPROVE' | 'REJECT' | 'SUSPEND' | null;
  }>({ salon: null, action: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Add Salon Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSalon, setNewSalon] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: '',
    locality: 'Lal Chowk',
    city: 'Srinagar',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const activeLocalityOptions = useMemo(() => {
    if (city === 'ALL') {
      return Object.values(CITY_LOCALITY_MAP).flat();
    }
    return CITY_LOCALITY_MAP[city] || [];
  }, [city]);

  const fetchSalons = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        applicationStatus,
        operationalStatus,
        locality,
      });
      if (city && city !== 'ALL') {
        query.set('city', city);
      }
      const tableRes = await fetch(`/api/salons?${query.toString()}`);
      if (tableRes.ok) {
        const data = await tableRes.json();
        setSalons(data.salons || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, applicationStatus, operationalStatus, city, locality]);

  useEffect(() => {
    fetchSalons();
  }, [fetchSalons]);

  const handleDecisionSubmit = async () => {
    if (!decisionModal.salon || !decisionModal.action) return;
    setDecisionLoading(true);

    let newAppStatus = 'APPROVED';
    if (decisionModal.action === 'REJECT') newAppStatus = 'REJECTED';
    if (decisionModal.action === 'SUSPEND') newAppStatus = 'SUSPENDED';

    try {
      const res = await fetch(`/api/salons/${decisionModal.salon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationStatus: newAppStatus,
          rejectionReason: decisionModal.action === 'REJECT' ? rejectionReason : null,
        }),
      });

      if (res.ok) {
        setDecisionModal({ salon: null, action: null });
        setRejectionReason('');
        fetchSalons();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleAddSalonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSalon),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register salon partner.');
      }
      setIsAddModalOpen(false);
      setNewSalon({
        name: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        address: '',
        locality: 'Lal Chowk',
        city: 'Srinagar',
      });
      fetchSalons();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Salons' }]}
      title="Salon Partner Management"
      description="Review partner onboarding applications, manage partner approvals, and monitor verified salon operations."
      actions={
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Partner Salon
          </button>
          <button
            onClick={fetchSalons}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Salon Directory"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64706E]">Total Listed Salons</div>
          <div className="text-xl font-bold text-[#17201F] mt-1">{pagination.total}</div>
          <div className="text-[10px] text-teal-700 font-medium mt-0.5">Across configured regions</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64706E]">Selected Territory</div>
          <div className="text-xl font-bold text-[#17201F] mt-1 truncate">
            {city === 'ALL' ? 'All India' : city}
          </div>
          <div className="text-[10px] text-[#64706E] mt-0.5 truncate">
            {locality === 'ALL' ? 'All localities' : locality}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64706E]">Operating Status</div>
          <div className="text-xl font-bold text-[#17201F] mt-1">
            {operationalStatus === 'OPEN' ? 'Open Now' : operationalStatus === 'CLOSED' ? 'Closed' : 'All Statuses'}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Real-time status filter</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E6] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64706E]">Current View</div>
          <div className="text-xl font-bold text-[#0F766E] mt-1">Directory Table</div>
          <div className="text-[10px] text-[#64706E] mt-0.5">Single verified data source</div>
        </div>
      </div>

      {/* Application Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { label: 'All Salons', value: 'ALL' },
          { label: 'Pending Review', value: 'PENDING' },
          { label: 'Approved & Active', value: 'APPROVED' },
          { label: 'Rejected', value: 'REJECTED' },
          { label: 'Suspended', value: 'SUSPENDED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setApplicationStatus(tab.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              applicationStatus === tab.value
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'bg-white text-[#64706E] border border-[#E2E8E6] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search, Operating Status & Location Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search salons by name, address, owner, city, or locality..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-xs text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Operating Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#64706E] whitespace-nowrap">Operating:</label>
            <select
              value={operationalStatus}
              onChange={(e) => {
                setOperationalStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs font-medium px-2.5 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Now</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#64706E] whitespace-nowrap">City:</label>
            <select
              value={city}
              onChange={(e) => {
                const nextCity = e.target.value;
                setCity(nextCity);
                setLocality('ALL');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs font-medium px-2.5 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Indian Cities</option>
              {Object.keys(CITY_LOCALITY_MAP).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Locality Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#64706E] whitespace-nowrap">Locality:</label>
            <select
              value={locality}
              onChange={(e) => {
                setLocality(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs font-medium px-2.5 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Localities</option>
              {activeLocalityOptions.map((loc: string) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Salons Directory Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4 font-bold">Salon Name</th>
                <th className="py-3 px-4 font-bold">Owner & Contact</th>
                <th className="py-3 px-4 font-bold">City & Locality</th>
                <th className="py-3 px-4 font-bold">Address</th>
                <th className="py-3 px-4 font-bold">Approval Status</th>
                <th className="py-3 px-4 font-bold">Operating Status</th>
                <th className="py-3 px-4 font-bold">Services & Staff</th>
                <th className="py-3 px-4 font-bold">Registered On</th>
                <th className="py-3 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && salons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500" suppressHydrationWarning>
                    <LoadingSpinner size="lg" className="mx-auto mb-2" />
                    Loading StyleSync Salon Partner Directory...
                  </td>
                </tr>
              ) : salons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No partner salons found matching the current search and filter criteria.
                  </td>
                </tr>
              ) : (
                salons.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Salon Name & Rating */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#17201F] text-sm">{s.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center gap-0.5 text-amber-600 font-semibold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{s.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-[10px] text-[#64706E]">
                          ({s.reviewCount} {s.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    </td>

                    {/* Owner & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#17201F]">{s.ownerName}</div>
                      <div className="flex items-center gap-1 text-[10px] text-[#64706E] mt-0.5">
                        <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{s.ownerEmail}</span>
                      </div>
                      {s.ownerPhone && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>{s.ownerPhone}</span>
                        </div>
                      )}
                    </td>

                    {/* City & Locality */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-semibold text-[#17201F]">
                        <MapPin className="w-3 h-3 text-[#0F766E] shrink-0" />
                        <span>{s.locality}</span>
                      </div>
                      <div className="text-[10px] text-[#64706E] mt-0.5">{s.city}</div>
                    </td>

                    {/* Street Address */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="text-[11px] text-[#17201F] line-clamp-2" title={s.address}>
                        {s.address || '—'}
                      </span>
                    </td>

                    {/* Approval Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={s.applicationStatus} />
                    </td>

                    {/* Operating Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.operationalStatus === 'OPEN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.operationalStatus === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        {s.operationalStatus === 'OPEN' ? 'Open Now' : 'Closed'}
                      </span>
                    </td>

                    {/* Services Offered & Stylists */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[#17201F] font-medium text-[11px]">
                        <Scissors className="w-3 h-3 text-[#0F766E]" />
                        <span>{s._count?.salonServices || 0} services</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#64706E] mt-0.5">
                        <Users className="w-2.5 h-2.5 text-slate-400" />
                        <span>{s._count?.staff || 0} stylists</span>
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#64706E] text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(s.createdAt)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/salons/${s.id}`}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/30 font-medium transition-colors text-xs"
                        >
                          View Details
                        </Link>

                        {/* Interactive Workflow Decisions */}
                        {s.applicationStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => setDecisionModal({ salon: s, action: 'APPROVE' })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setDecisionModal({ salon: s, action: 'REJECT' })}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors cursor-pointer text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {s.applicationStatus === 'APPROVED' && (
                          <button
                            onClick={() => setDecisionModal({ salon: s, action: 'SUSPEND' })}
                            className="px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 font-medium transition-colors cursor-pointer text-xs"
                          >
                            Suspend
                          </button>
                        )}

                        {s.applicationStatus === 'SUSPENDED' && (
                          <button
                            onClick={() => setDecisionModal({ salon: s, action: 'APPROVE' })}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer text-xs"
                          >
                            Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-[#E2E8E6] bg-slate-50 flex items-center justify-between text-xs text-[#64706E] flex-wrap gap-2">
          <div>
            Showing{' '}
            <span className="font-semibold text-[#17201F]">
              {salons.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> partner salons
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
              className="p-1 rounded-lg border border-[#E2E8E6] bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              title="Previous Page"
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
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Decision Modal (Approve / Reject / Suspend) */}
      <Modal
        isOpen={!!decisionModal.salon && !!decisionModal.action}
        onClose={() => setDecisionModal({ salon: null, action: null })}
        title={
          decisionModal.action === 'APPROVE'
            ? `Approve Salon: ${decisionModal.salon?.name}`
            : decisionModal.action === 'REJECT'
            ? `Reject Application: ${decisionModal.salon?.name}`
            : `Suspend Salon Partner: ${decisionModal.salon?.name}`
        }
        description="Administrative action executed with documented audit log."
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#64706E]">
            {decisionModal.action === 'APPROVE' &&
              'Approving will mark this partner as VERIFIED and permit platform customers to view service offerings and book appointments.'}
            {decisionModal.action === 'REJECT' &&
              'Rejecting this application will notify the salon owner and prevent customer bookings. Please provide a clear administrative reason.'}
            {decisionModal.action === 'SUSPEND' &&
              'Suspending this salon temporarily pauses all future booking slots. Existing historical financial records and appointment logs are preserved.'}
          </p>

          {decisionModal.action === 'REJECT' && (
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                Reason for Application Rejection (Required)
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete trade license document or mismatched ownership GSTIN..."
                className="w-full p-2.5 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              onClick={() => setDecisionModal({ salon: null, action: null })}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDecisionSubmit}
              disabled={decisionLoading || (decisionModal.action === 'REJECT' && !rejectionReason.trim())}
              className={`px-4 py-2 font-semibold text-white rounded-lg cursor-pointer disabled:opacity-50 ${
                decisionModal.action === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : decisionModal.action === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {decisionLoading ? 'Processing...' : 'Confirm Decision'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Partner Salon Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Partner Salon"
        description="Register a beauty salon or spa partner in the platform database."
      >
        <form onSubmit={handleAddSalonSubmit} className="space-y-4 text-xs">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {addError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Salon Business Name</label>
            <input
              type="text"
              required
              value={newSalon.name}
              onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
              placeholder="e.g. Zabarwan Luxury Parlour"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={newSalon.ownerName}
                onChange={(e) => setNewSalon({ ...newSalon, ownerName: e.target.value })}
                placeholder="Owner full name"
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Owner Phone</label>
              <input
                type="tel"
                required
                value={newSalon.ownerPhone}
                onChange={(e) => setNewSalon({ ...newSalon, ownerPhone: e.target.value })}
                placeholder="+919419099888"
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Owner Business Email</label>
            <input
              type="email"
              required
              value={newSalon.ownerEmail}
              onChange={(e) => setNewSalon({ ...newSalon, ownerEmail: e.target.value })}
              placeholder="owner@example.com"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Street Address</label>
            <input
              type="text"
              required
              value={newSalon.address}
              onChange={(e) => setNewSalon({ ...newSalon, address: e.target.value })}
              placeholder="e.g. Gole Market, Karan Nagar"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">City</label>
              <select
                value={newSalon.city}
                onChange={(e) => {
                  const selectedCity = e.target.value;
                  const firstLoc = CITY_LOCALITY_MAP[selectedCity]?.[0] || 'Main Area';
                  setNewSalon({ ...newSalon, city: selectedCity, locality: firstLoc });
                }}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg bg-white text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              >
                {Object.keys(CITY_LOCALITY_MAP).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Locality</label>
              <select
                value={newSalon.locality}
                onChange={(e) => setNewSalon({ ...newSalon, locality: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              >
                {(CITY_LOCALITY_MAP[newSalon.city] || ['Main Area']).map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {addLoading ? 'Registering...' : 'Register Partner'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export default function SalonsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Salons' }]}>
          <div className="py-24 text-center" suppressHydrationWarning>
            <LoadingSpinner size="lg" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading salon directory...</p>
          </div>
        </AdminShell>
      }
    >
      <SalonsContent />
    </Suspense>
  );
}
