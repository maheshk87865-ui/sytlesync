'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import {
  Cpu,
  Sparkles,
  Camera,
  Scissors,
  MapPin,
  RotateCw,
  ShieldCheck,
  Zap,
  Clock,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AILog {
  id: string;
  operationType: string;
  modelUsed: string;
  promptSnippet?: string;
  tokensUsed: number;
  latencyMs: number;
  status: string;
  costEstimateInr: number;
  createdAt: string;
}

export default function AIOperationsPage() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  const fetchAIOps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-operations?type=${filterType}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setSummary(data.summary);
        setFeatureFlags(data.featureFlags || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchAIOps();
  }, [fetchAIOps]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HAIRSTYLE_TRYON':
        return <Camera className="w-4 h-4 text-purple-600" />;
      case 'SALON_MATCHING':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'PHOTO_ANALYSIS':
        return <Scissors className="w-4 h-4 text-sky-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#0F766E]" />;
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'AI Operations' }]}
      title="AI Operations & Telemetry Monitoring"
      description="Track beauty recommendation latency, virtual hairstyle try-on pipelines, model token expenditure, and privacy guards."
      actions={
        <button
          onClick={fetchAIOps}
          className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          title="Refresh Telemetry"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
        </button>
      }
    >
      {/* Privacy Guard Notice */}
      <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3 text-xs text-purple-900">
        <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sm block">Customer Biometric & Photo Privacy Policy Active</span>
          <p className="mt-0.5 text-purple-800">
            In compliance with platform data protection standards, customer hairstyle preview photos and facial landmarks are processed ephemerally in volatile memory. No customer face imagery is stored permanently in the administrative database or exposed in this dashboard.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Total Invocations</span>
          <div className="text-2xl font-bold text-[#17201F] mt-1">
            {summary?.totalOperations || 0}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {summary?.successRate || 100}% Success Rate
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Average Latency</span>
          <div className="text-2xl font-bold text-[#0F766E] mt-1">
            {summary?.averageLatencyMs || 0} ms
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Across Gemini 1.5 endpoints</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Total Tokens Consumed</span>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {(summary?.totalTokensConsumed || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Prompt & Completion</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
          <span className="text-xs font-medium text-[#64706E]">Estimated Inference Cost</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{summary?.totalEstimatedCostInr || 0}
          </div>
          <span className="text-[11px] text-[#0F766E] font-medium">Srinagar pilot usage</span>
        </div>
      </div>

      {/* Operation Type Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { label: 'All Operations', value: 'ALL' },
          { label: 'Beauty Recommendations', value: 'RECOMMENDATION' },
          { label: 'Hairstyle Camera Try-On', value: 'HAIRSTYLE_TRYON' },
          { label: 'AI Salon Matching', value: 'SALON_MATCHING' },
          { label: 'Photo Scalp Analysis', value: 'PHOTO_ANALYSIS' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterType === tab.value
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'bg-white text-[#64706E] border border-[#E2E8E6] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-[#E2E8E6] text-xs font-bold text-[#17201F] flex items-center justify-between">
          <span>Inference Telemetry Stream ({logs.length} logged calls)</span>
          <span className="text-[11px] text-slate-500 font-normal">Active Models: gemini-1.5-pro, gemini-1.5-flash</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Operation Type</th>
                <th className="py-3 px-4">Model Engine</th>
                <th className="py-3 px-4">Prompt Context Snippet</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Cost (INR)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying AI operations telemetry...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No inference calls recorded for this operation category.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#17201F]">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(l.operationType)}
                        <span>{l.operationType}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                      {l.modelUsed}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-[#64706E] truncate">
                      {l.promptSnippet || 'Ephemeral prompt execution'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F766E]">
                      {l.latencyMs} ms
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono">
                      {l.tokensUsed}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#17201F]">
                      ₹{l.costEstimateInr}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 text-[10px]">
                      {new Date(l.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
