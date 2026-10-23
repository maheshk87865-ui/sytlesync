'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import {
  BarChart3,
  Download,
  RotateCw,
  TrendingUp,
  Users,
  Building2,
  CalendarCheck,
  CreditCard,
  Star,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [range, setRange] = useState('30days');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = () => {
    window.location.href = `/api/analytics?range=${range}&export=csv`;
  };

  const s = data?.summary;

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Analytics & Reports' }]}
      title="Analytics, Metrics & Financial Reports"
      description="Deep statistical analysis across Srinagar appointments, customer retention rates, and salon quality benchmarks."
      actions={
        <div className="flex items-center gap-2.5">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] shadow-2xs"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time History</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* KPI Performance Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Repeat Booking Rate</span>
          <div className="text-2xl font-bold text-[#0F766E] mt-1">
            {s?.repeatRate || 0}%
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Customer loyalty ratio in Srinagar</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Cancellation Rate</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {s?.cancellationRate || 0}%
          </div>
          <span className="text-[11px] text-[#64706E]">Platform policy compliance</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Gross Booking Value</span>
          <div className="text-2xl font-bold text-[#17201F] mt-1">
            ₹{(s?.grossBookingValue || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">Total appointments booked</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Platform Commission Earned</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{(s?.platformCommission || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#0F766E] font-medium">7% first / 2% repeat bookings</span>
        </div>
      </div>

      {/* Salon Performance Benchmark Table & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Salons Benchmark */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <h3 className="text-sm font-bold text-[#17201F] mb-1">
            Top Rated Srinagar Salon Partners
          </h3>
          <p className="text-xs text-[#64706E] mb-4">Ranked by customer satisfaction score</p>

          <div className="divide-y divide-[#E2E8E6]">
            {data?.topSalons?.map((sal: any, idx: number) => (
              <div key={sal.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-[#17201F]">{sal.name}</div>
                    <div className="text-[10px] text-[#64706E]">{sal.locality}, Srinagar</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-bold text-[#0F766E]">{sal._count.bookings} bookings</div>
                    <div className="text-[10px] text-slate-400">{sal.reviewCount} reviews</div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{sal.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services by Revenue */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <h3 className="text-sm font-bold text-[#17201F] mb-1">
            High-Volume Services Breakdown
          </h3>
          <p className="text-xs text-[#64706E] mb-4">Aggregate sales per beauty service</p>

          <div className="divide-y divide-[#E2E8E6]">
            {data?.topServices?.map((serv: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <div className="font-bold text-[#17201F]">{serv.name}</div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div className="text-[11px] text-[#64706E]">{serv.bookings} appointments</div>
                  <div className="font-bold text-[#17201F]">₹{serv.revenue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
