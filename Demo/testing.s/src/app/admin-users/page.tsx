'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  UserPlus,
  RotateCw,
  Edit2,
  Lock,
  Mail,
  User,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite / Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: 'OPERATIONS_ADMIN',
    password: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit / Status Modal
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-users');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to provision admin account.');

      setIsCreateOpen(false);
      setFormState({ name: '', email: '', role: 'OPERATIONS_ADMIN', password: '' });
      fetchAdmins();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditLoading(true);

    try {
      const res = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAdmin.id,
          role: editRole,
          status: editStatus,
        }),
      });

      if (res.ok) {
        setEditingAdmin(null);
        fetchAdmins();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditLoading(false);
    }
  };

  const openEdit = (a: AdminAccount) => {
    setEditingAdmin(a);
    setEditRole(a.role);
    setEditStatus(a.status);
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Admin Users' }]}
      title="Administrator Directory & RBAC Roles"
      description="Manage administrative staff accounts, configure role permissions, and track active sessions."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Provision Administrator
          </button>
          <button
            onClick={fetchAdmins}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Directory"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Loading administrator directory...
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#17201F] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs">
                        {a.name[0]}
                      </div>
                      <span>{a.name}</span>
                      {a.id === currentUser?.id && (
                        <span className="text-[10px] bg-[#CCFBF1] text-[#0F766E] font-bold px-1.5 py-0.5 rounded-sm">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{a.email}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F766E]">
                      {a.role.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3.5 px-4 text-[#64706E]">
                      {a.lastLoginAt
                        ? new Date(a.lastLoginAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-[#64706E]">
                      {new Date(a.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEdit(a)}
                        className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/40 font-medium transition-colors cursor-pointer"
                      >
                        Edit Role / Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Admin Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision Administrator Account"
        description="Create credentials and assign granular RBAC privileges."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Full Staff Name</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="e.g. Zahid Ahmad"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Official Email Address</label>
            <input
              type="email"
              required
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
              placeholder="zahid@stylesync.in"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Assigned Role</label>
            <select
              value={formState.role}
              onChange={(e) => setFormState({ ...formState, role: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full platform permissions)</option>
              <option value="OPERATIONS_ADMIN">OPERATIONS_ADMIN (Salons, customers, services, bookings)</option>
              <option value="FINANCE_ADMIN">FINANCE_ADMIN (Payments, refunds, commissions)</option>
              <option value="SUPPORT_ADMIN">SUPPORT_ADMIN (Customer & salon disputes)</option>
              <option value="ANALYST">ANALYST (Read-only intelligence & reports)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={formState.password}
              onChange={(e) => setFormState({ ...formState, password: e.target.value })}
              placeholder="Minimum 8 characters..."
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
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
              disabled={formLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {formLoading ? 'Provisioning...' : 'Provision Administrator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Role / Status Modal */}
      <Modal
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        title={`Modify Admin Account: ${editingAdmin?.name}`}
        description={`Email: ${editingAdmin?.email}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Administrative Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="OPERATIONS_ADMIN">OPERATIONS_ADMIN</option>
              <option value="FINANCE_ADMIN">FINANCE_ADMIN</option>
              <option value="SUPPORT_ADMIN">SUPPORT_ADMIN</option>
              <option value="ANALYST">ANALYST</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Account Active Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg"
            >
              <option value="ACTIVE">Active (Allowed to sign in)</option>
              <option value="INACTIVE">Inactive (Revoke access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setEditingAdmin(null)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {editLoading ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
