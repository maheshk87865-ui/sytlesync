'use client';

import React, { useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Shield,
  KeyRound,
  LogOut,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [passwordState, setPasswordState] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setFeedback({ message: 'Passwords do not match.', type: 'error' });
      return;
    }

    if (passwordState.newPassword.length < 8) {
      setFeedback({ message: 'Password must be at least 8 characters.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user?.id,
          password: passwordState.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update security credentials.');

      setFeedback({ message: 'Password changed successfully.', type: 'success' });
      setPasswordState({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Admin Profile' }]}
      title="Administrator Profile & Security"
      description="Manage your administrative credentials, active session tokens, and security settings."
    >
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        {/* User Card */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8E6] shadow-xs text-center flex flex-col items-center justify-between">
          <div>
            <div className="w-20 h-20 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-extrabold text-3xl shadow-md mx-auto mb-4">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <h3 className="text-base font-bold text-[#17201F]">{user?.name}</h3>
            <p className="text-xs text-[#64706E] font-mono mt-0.5">{user?.email}</p>

            <div className="mt-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="w-full mt-6 pt-6 border-t border-[#E2E8E6]">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> End Administrative Session
            </button>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-[#E2E8E6] shadow-xs">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#E2E8E6]">
            <KeyRound className="w-5 h-5 text-[#0F766E]" />
            <div>
              <h4 className="font-bold text-sm text-[#17201F]">Update Administrator Password</h4>
              <p className="text-xs text-[#64706E]">
                Enforce high-entropy password standards for administrative access
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                New Security Password
              </label>
              <input
                type="password"
                required
                value={passwordState.newPassword}
                onChange={(e) =>
                  setPasswordState({ ...passwordState, newPassword: e.target.value })
                }
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#17201F] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordState.confirmPassword}
                onChange={(e) =>
                  setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                }
                placeholder="Re-type new password"
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Updating Credentials...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
