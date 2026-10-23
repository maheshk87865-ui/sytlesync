'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  Star,
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reportStatus: 'NORMAL' | 'REPORTED';
  moderationStatus: 'APPROVED' | 'HIDDEN' | 'UNDER_REVIEW';
  moderationReason?: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  salon: { id: string; name: string; locality: string };
  booking?: { id: string; bookingNumber: string; appointmentDate: string };
}

function ReviewsContent() {
  const searchParams = useSearchParams();
  const initialReportStatus = searchParams.get('reportStatus') || 'ALL';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reportStatus, setReportStatus] = useState(initialReportStatus);
  const [moderationStatus, setModerationStatus] = useState('ALL');
  const [rating, setRating] = useState('ALL');

  // Moderation Action Modal
  const [moderatingReview, setModeratingReview] = useState<Review | null>(null);
  const [newModerationStatus, setNewModerationStatus] = useState<'APPROVED' | 'HIDDEN' | 'UNDER_REVIEW'>('APPROVED');
  const [moderationReason, setModerationReason] = useState('');
  const [modLoading, setModLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        reportStatus,
        moderationStatus,
        rating,
      });
      const res = await fetch(`/api/reviews?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, reportStatus, moderationStatus, rating]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openModeration = (r: Review, nextStatus: 'APPROVED' | 'HIDDEN' | 'UNDER_REVIEW') => {
    setModeratingReview(r);
    setNewModerationStatus(nextStatus);
    setModerationReason(r.moderationReason || '');
  };

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderatingReview) return;
    setModLoading(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: moderatingReview.id,
          moderationStatus: newModerationStatus,
          reportStatus: newModerationStatus === 'APPROVED' ? 'NORMAL' : moderatingReview.reportStatus,
          moderationReason,
        }),
      });

      if (res.ok) {
        setModeratingReview(null);
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Reviews & Moderation' }]}
      title="Customer Reviews & Content Moderation"
      description="Inspect customer ratings, verify disputed or reported salon feedback, and moderate content."
      actions={
        <button
          onClick={fetchReviews}
          className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          title="Refresh Reviews"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
        </button>
      }
    >
      {/* Report Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { label: 'All Reviews', value: 'ALL' },
          { label: 'Reported / Flagged', value: 'REPORTED' },
          { label: 'Normal Feedback', value: 'NORMAL' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setReportStatus(tab.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              reportStatus === tab.value
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'bg-white text-[#64706E] border border-[#E2E8E6] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Moderation Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search comment keywords, customer name, salon..."
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
            value={moderationStatus}
            onChange={(e) => {
              setModerationStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Moderation States</option>
            <option value="APPROVED">Approved (Visible)</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="HIDDEN">Hidden from App</option>
          </select>

          <select
            value={rating}
            onChange={(e) => {
              setRating(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Salon Partner</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Review Content</th>
                <th className="py-3 px-4">Report Status</th>
                <th className="py-3 px-4">Moderation State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying StyleSync reviews database...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No reviews found matching current moderation criteria.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#17201F]">{r.salon.name}</div>
                      <div className="text-[10px] text-[#64706E]">{r.salon.locality}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#17201F]">{r.customer.name}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>{r.rating}.0</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="text-[#17201F] line-clamp-2">&ldquo;{r.comment}&rdquo;</p>
                      {r.moderationReason && (
                        <div className="text-[10px] text-rose-600 mt-1 font-medium">
                          Note: {r.moderationReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.reportStatus === 'REPORTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          REPORTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.moderationStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.moderationStatus !== 'APPROVED' && (
                          <button
                            onClick={() => openModeration(r, 'APPROVED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {r.moderationStatus !== 'HIDDEN' && (
                          <button
                            onClick={() => openModeration(r, 'HIDDEN')}
                            className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                          >
                            Hide
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
        <div className="px-4 py-3 border-t border-[#E2E8E6] bg-slate-50 flex items-center justify-between text-xs text-[#64706E]">
          <div>
            Showing{' '}
            <span className="font-semibold text-[#17201F]">
              {reviews.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> reviews
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

      {/* Moderation Reason Modal */}
      <Modal
        isOpen={!!moderatingReview}
        onClose={() => setModeratingReview(null)}
        title={`Moderate Customer Review (${newModerationStatus})`}
        description={`Author: ${moderatingReview?.customer.name} for ${moderatingReview?.salon.name}`}
      >
        <form onSubmit={handleModerationSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
            <div className="flex items-center gap-1 text-amber-500 font-bold mb-1">
              <Star className="w-4 h-4 fill-amber-500" />
              <span>{moderatingReview?.rating}.0 Rating</span>
            </div>
            <p className="text-[#17201F] italic">&ldquo;{moderatingReview?.comment}&rdquo;</p>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">
              Administrative Moderation Note / Reason:
            </label>
            <textarea
              required
              rows={3}
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="e.g. Verified customer appointment completion; review complies with terms..."
              className="w-full p-2.5 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setModeratingReview(null)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modLoading || !moderationReason.trim()}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {modLoading ? 'Saving...' : 'Apply Moderation Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Reviews & Moderation' }]}>
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs text-slate-500">Loading reviews queue...</p>
          </div>
        </AdminShell>
      }
    >
      <ReviewsContent />
    </Suspense>
  );
}
