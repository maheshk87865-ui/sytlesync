'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  Search,
  UserPlus,
  RotateCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  locality: string;
  city: string;
  status: 'ACTIVE' | 'SUSPENDED';
  bookingCount: number;
  totalSpent: number;
  createdAt: string;
  _count?: { bookings: number; reviews: number; supportTickets: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  // New Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    locality: 'Lal Chowk',
    city: 'Srinagar',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Status Action Confirmation
  const [actionCustomer, setActionCustomer] = useState<Customer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
      });
      const res = await fetch(`/api/customers?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async () => {
    if (!actionCustomer) return;
    setActionLoading(true);
    const newStatus = actionCustomer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/customers/${actionCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setActionCustomer(null);
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register customer.');
      }
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', email: '', phone: '', locality: 'Lal Chowk', city: 'Srinagar' });
      fetchCustomers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Customers' }]}
      title="Customer Management"
      description="Manage registered Srinagar beauty service customers, verify accounts, and inspect booking history."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Customer
          </button>
          <button
            onClick={fetchCustomers}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Table"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, phone, locality..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-xs text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#64706E] whitespace-nowrap">Status:</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Customer Records Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Srinagar Locality</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Bookings</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Querying StyleSync Customer Database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#17201F]">{c.name}</div>
                      <div className="text-[10px] text-[#64706E]">
                        Joined {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[#17201F]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64706E] mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[#17201F]">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{c.locality}</span>
                      </div>
                      <div className="text-[10px] text-[#64706E]">{c.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F766E]">
                      {c.bookingCount} bookings
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#17201F]">
                      ₹{(c.totalSpent || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/customers/${c.id}`}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/40 font-medium transition-colors"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => setActionCustomer(c)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            c.status === 'ACTIVE'
                              ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
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
              {customers.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17201F]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17201F]">{pagination.total}</span> customers
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Customer"
        description="Create an authorized StyleSync customer record in Srinagar pilot directory."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder="e.g. Insha Bashir"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              placeholder="insha.bashir@example.com"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Phone Number (Indian Mobile)</label>
            <input
              type="tel"
              required
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              placeholder="+919419110044"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Locality (Srinagar)</label>
              <select
                value={newCustomer.locality}
                onChange={(e) => setNewCustomer({ ...newCustomer, locality: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="Lal Chowk">Lal Chowk</option>
                <option value="Rajbagh">Rajbagh</option>
                <option value="Karan Nagar">Karan Nagar</option>
                <option value="Sanat Nagar">Sanat Nagar</option>
                <option value="Hazratbal">Hazratbal</option>
                <option value="Jawahar Nagar">Jawahar Nagar</option>
                <option value="Bemina">Bemina</option>
                <option value="Soura">Soura</option>
                <option value="Dalgate">Dalgate</option>
                <option value="Nishat">Nishat</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">City</label>
              <input
                type="text"
                disabled
                value="Srinagar"
                className="w-full px-3 py-2 bg-slate-100 border border-[#E2E8E6] rounded-lg text-slate-500"
              />
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
              disabled={modalLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {modalLoading ? 'Creating Customer...' : 'Create Customer Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Account Status Confirmation Modal */}
      <Modal
        isOpen={!!actionCustomer}
        onClose={() => setActionCustomer(null)}
        title={
          actionCustomer?.status === 'ACTIVE'
            ? `Suspend Account: ${actionCustomer?.name}`
            : `Reactivate Account: ${actionCustomer?.name}`
        }
        description="Sensitive administrative action with mandatory audit logging."
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#64706E]">
            {actionCustomer?.status === 'ACTIVE'
              ? 'Suspending this customer prevents future appointment bookings. Historical records, payments, and completed appointments remain permanently preserved.'
              : 'Reactivating this customer immediately restores booking capabilities across all approved Srinagar partner salons.'}
          </p>

          <div className="p-3 bg-slate-50 rounded-lg border border-[#E2E8E6]">
            <div className="font-semibold text-[#17201F]">{actionCustomer?.name}</div>
            <div className="text-[#64706E]">{actionCustomer?.email} • {actionCustomer?.phone}</div>
            <div className="text-[11px] text-[#0F766E] mt-1">
              Historical appointments: {actionCustomer?.bookingCount} • Total spent: ₹{actionCustomer?.totalSpent}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setActionCustomer(null)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleToggleStatus}
              className={`px-4 py-2 font-semibold text-white rounded-lg cursor-pointer ${
                actionCustomer?.status === 'ACTIVE'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionLoading
                ? 'Updating Status...'
                : actionCustomer?.status === 'ACTIVE'
                ? 'Confirm Account Suspension'
                : 'Confirm Reactivation'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
