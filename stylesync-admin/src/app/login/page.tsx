'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, Loader2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@stylesync.in');
  const [password, setPassword] = useState('AdminPassword123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      login(data);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('AdminPassword123!');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8" suppressHydrationWarning>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0F766E] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-[#0F766E]/20">
          S
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#17201F]">
          StyleSync Super Admin
        </h2>
        <p className="mt-1 text-xs text-[#64706E]">
          Srinagar Territory Administrative Gateway • Pilot Region: Jammu & Kashmir
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-[#E2E8E6] sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
            <div>
              <label className="block text-xs font-semibold text-[#17201F] uppercase tracking-wider mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {mounted ? <Mail className="w-4 h-4" /> : <span className="w-4 h-4 block" aria-hidden="true" />}
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stylesync.in"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-[#E2E8E6] rounded-xl text-sm text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17201F] uppercase tracking-wider mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {mounted ? <Lock className="w-4 h-4" /> : <span className="w-4 h-4 block" aria-hidden="true" />}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-[#E2E8E6] rounded-xl text-sm text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] active:scale-[0.99] transition-all shadow-md shadow-[#0F766E]/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  {mounted ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-4 h-4 block" />}
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In to Super Admin {mounted ? <ArrowRight className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Roles */}
          <div className="mt-8 pt-6 border-t border-[#E2E8E6]">
            <span className="block text-[11px] font-semibold text-[#64706E] uppercase tracking-wider text-center mb-3">
              Quick Test Access (Pre-Configured Accounts)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@stylesync.in')}
                className="p-2 rounded-lg border border-[#E2E8E6] hover:bg-[#CCFBF1]/40 hover:border-[#0F766E] text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[#0F766E]">Super Admin</div>
                <div className="text-[10px] text-[#64706E] truncate">admin@stylesync.in</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ops@stylesync.in')}
                className="p-2 rounded-lg border border-[#E2E8E6] hover:bg-slate-50 hover:border-slate-300 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-800">Operations</div>
                <div className="text-[10px] text-[#64706E] truncate">ops@stylesync.in</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('finance@stylesync.in')}
                className="p-2 rounded-lg border border-[#E2E8E6] hover:bg-slate-50 hover:border-slate-300 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-800">Finance Lead</div>
                <div className="text-[10px] text-[#64706E] truncate">finance@stylesync.in</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('support@stylesync.in')}
                className="p-2 rounded-lg border border-[#E2E8E6] hover:bg-slate-50 hover:border-slate-300 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-800">Customer Support</div>
                <div className="text-[10px] text-[#64706E] truncate">support@stylesync.in</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#64706E]" suppressHydrationWarning>
          {mounted ? <ShieldCheck className="w-4 h-4 text-[#0F766E]" /> : <span className="w-4 h-4 block" />}
          <span>Server-Side RBAC Session & Audit Trail Active</span>
        </div>
      </div>
    </div>
  );
}
