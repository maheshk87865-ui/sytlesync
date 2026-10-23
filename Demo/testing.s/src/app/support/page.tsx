'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  HelpCircle,
  Search,
  Plus,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  User,
  Building2,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface TicketMessage {
  id: string;
  senderType: string;
  senderName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId?: string;
  salonId?: string;
  bookingId?: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  internalNotes?: string;
  assignedAdminId?: string;
  createdAt: string;
  customer?: { id: string; name: string; email: string; phone: string };
  salon?: { id: string; name: string; locality: string };
  booking?: { id: string; bookingNumber: string; price: number };
  assignedAdmin?: { id: string; name: string; email: string };
  messages: TicketMessage[];
}

function SupportContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'ALL';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('ALL');
  const [category, setCategory] = useState('ALL');

  // Selected Ticket Conversation Drawer / Modal
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  // Create Ticket Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'BOOKING',
    priority: 'MEDIUM',
    description: '',
    internalNotes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
        priority,
        category,
      });
      const res = await fetch(`/api/support?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setAdmins(data.admins || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status, priority, category]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateTicket = async (statusVal?: string, priorityVal?: string, adminVal?: string) => {
    if (!activeTicket) return;
    try {
      const res = await fetch('/api/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTicket.id,
          status: statusVal,
          priority: priorityVal,
          assignedAdminId: adminVal,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveTicket((prev) => (prev ? { ...prev, ...updated.ticket } : null));
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;
    setReplyLoading(true);

    try {
      const res = await fetch('/api/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTicket.id,
          replyMessage: replyMessage.trim(),
          isInternal: isInternalNote,
        }),
      });

      if (res.ok) {
        setReplyMessage('');
        setIsInternalNote(false);
        // Refresh active ticket
        const refreshedRes = await fetch(`/api/support?search=${encodeURIComponent(activeTicket.ticketNumber)}`);
        if (refreshedRes.ok) {
          const data = await refreshedRes.json();
          if (data.tickets?.[0]) setActiveTicket(data.tickets[0]);
        }
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setNewTicket({
          subject: '',
          category: 'BOOKING',
          priority: 'MEDIUM',
          description: '',
          internalNotes: '',
        });
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Support & Disputes' }]}
      title="Support & Customer Dispute Center"
      description="Manage appointment conflicts, payment disputes, salon inquiries, and customer grievances."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Ticket
          </button>
          <button
            onClick={fetchTickets}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Tickets"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticket number, customer, salon, subject..."
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
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Categories</option>
            <option value="BOOKING">Booking Issue</option>
            <option value="PAYMENT">Payment / UPI</option>
            <option value="REFUND">Refund Dispute</option>
            <option value="TECHNICAL">Technical</option>
            <option value="ACCOUNT">Account</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Ticket Ref</th>
                <th className="py-3 px-4">Subject & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Parties Involved</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying StyleSync support desk...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No tickets found matching the specified parameters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F766E]">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-[#17201F] text-sm">{t.subject}</div>
                      <div className="text-[10px] text-[#64706E] line-clamp-1 mt-0.5">
                        {t.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.customer && (
                        <div className="font-semibold text-[#17201F]">{t.customer.name}</div>
                      )}
                      {t.salon && (
                        <div className="text-[10px] text-[#64706E]">{t.salon.name}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : t.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveTicket(t)}
                        className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/40 font-medium transition-colors cursor-pointer"
                      >
                        Open Ticket
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
              {tickets.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> tickets
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

      {/* Ticket Conversation & Action Modal */}
      <Modal
        isOpen={!!activeTicket}
        onClose={() => setActiveTicket(null)}
        title={`Support Ticket: ${activeTicket?.ticketNumber}`}
        description={activeTicket?.subject}
        maxWidth="xl"
      >
        {activeTicket && (
          <div className="space-y-4 text-xs">
            {/* Quick Status and Priority Toolbar */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-[#E2E8E6] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[#64706E]">Status:</span>
                <select
                  value={activeTicket.status}
                  onChange={(e) => handleUpdateTicket(e.target.value)}
                  className="px-2 py-1 bg-white border border-[#E2E8E6] rounded-md font-semibold text-[#17201F]"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#64706E]">Priority:</span>
                <select
                  value={activeTicket.priority}
                  onChange={(e) => handleUpdateTicket(undefined, e.target.value)}
                  className="px-2 py-1 bg-white border border-[#E2E8E6] rounded-md font-semibold text-[#17201F]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#64706E]">Assignee:</span>
                <select
                  value={activeTicket.assignedAdminId || ''}
                  onChange={(e) => handleUpdateTicket(undefined, undefined, e.target.value)}
                  className="px-2 py-1 bg-white border border-[#E2E8E6] rounded-md font-semibold text-[#17201F]"
                >
                  <option value="">Unassigned</option>
                  {admins.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conversation Log */}
            <div className="p-3 bg-slate-50/50 rounded-xl border border-[#E2E8E6] max-h-60 overflow-y-auto space-y-2.5">
              <div className="p-2.5 bg-white rounded-lg border border-[#E2E8E6]">
                <div className="flex items-center justify-between text-[10px] text-[#64706E] mb-1">
                  <span className="font-bold text-[#17201F]">Original Inquiry</span>
                  <span>{new Date(activeTicket.createdAt).toLocaleTimeString('en-IN')}</span>
                </div>
                <p className="text-[#17201F]">{activeTicket.description}</p>
              </div>

              {activeTicket.messages?.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-lg border text-xs ${
                    m.isInternal
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : m.senderType === 'ADMIN'
                      ? 'bg-[#CCFBF1]/30 border-[#99F6E4] text-[#17201F]'
                      : 'bg-white border-[#E2E8E6] text-[#17201F]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold flex items-center gap-1">
                      {m.isInternal && <Lock className="w-3 h-3 text-amber-600" />}
                      {m.senderName} ({m.senderType})
                    </span>
                    <span className="text-slate-400">
                      {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p>{m.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-[#E2E8E6]">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#17201F]">Post Response or Note:</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#64706E]">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded text-[#0F766E]"
                  />
                  <span>Private Internal Staff Note</span>
                </label>
              </div>

              <textarea
                required
                rows={2}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Write confidential notes for support staff only...'
                    : 'Compose reply message for customer / salon...'
                }
                className="w-full p-2.5 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={replyLoading || !replyMessage.trim()}
                  className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {replyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isInternalNote ? 'Save Private Note' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Create Support Ticket Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Support Ticket"
        description="Log an administrative case or dispute regarding Srinagar operations."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Subject</label>
            <input
              type="text"
              required
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              placeholder="e.g. Disputed appointment charge in Rajbagh"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Category</label>
              <select
                value={newTicket.category}
                onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg"
              >
                <option value="BOOKING">Booking Issue</option>
                <option value="PAYMENT">Payment</option>
                <option value="REFUND">Refund</option>
                <option value="SALON">Salon Partner</option>
                <option value="TECHNICAL">Technical</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="Provide full background regarding the complaint or inquiry..."
              className="w-full p-2.5 border border-[#E2E8E6] rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {createLoading ? 'Logging Ticket...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <AdminShell breadcrumbs={[{ label: 'Support & Disputes' }]}>
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs text-slate-500">Loading support cases...</p>
          </div>
        </AdminShell>
      }
    >
      <SupportContent />
    </Suspense>
  );
}
