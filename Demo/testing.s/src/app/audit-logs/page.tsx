'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import {
  ShieldAlert,
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Terminal,
  Loader2,
} from 'lucide-react';

interface AuditLog {
  id: string;
  adminId?: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  detailsJson?: string;
  ipAddress?: string;
  createdAt: string;
  admin?: { name: string; role: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('ALL');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        entityType,
      });
      const res = await fetch(`/api/audit-logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, entityType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Audit Logs' }]}
      title="Immutable Security & Administrative Audit Logs"
      description="Tamper-proof chronological trail recording salon approvals, refunds, user privilege changes, and moderation interventions."
      actions={
        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          title="Refresh Logs"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
        </button>
      }
    >
      {/* Integrity Banner */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs shadow-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-sm block">System Audit Trail Enforced</span>
            <span className="text-slate-400">
              Every state mutation is stamped with administrative session tokens, action classification, and network IPs.
            </span>
          </div>
        </div>
        <div className="hidden sm:block text-right text-[11px] text-slate-400">
          Append-Only SQLite Ledger
        </div>
      </div>

      {/* Search & Entity Filter */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, administrator email, entity ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-xs text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#64706E] whitespace-nowrap">Entity Filter:</label>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Entity Types</option>
            <option value="Salon">Salon</option>
            <option value="Customer">Customer</option>
            <option value="Booking">Booking</option>
            <option value="Refund">Refund</option>
            <option value="Review">Review</option>
            <option value="Admin">Admin</option>
            <option value="PlatformSetting">Platform Setting</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Context Details</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying audit history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="font-semibold text-[#17201F]">
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#17201F]">
                        {log.admin?.name || log.adminEmail.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-[#64706E] font-mono">{log.adminEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1]/40 px-2 py-0.5 rounded-md border border-[#99F6E4]/50">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#17201F]">{log.entityType}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {log.entityId ? log.entityId.slice(0, 14) : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-mono text-[11px] text-slate-600">
                      {log.detailsJson || '{}'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
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
              {logs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> audit records
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
    </AdminShell>
  );
}
