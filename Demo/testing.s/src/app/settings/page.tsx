'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import {
  Settings,
  Save,
  RotateCw,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Percent,
  Sparkles,
  MapPin,
  CreditCard,
  Loader2,
} from 'lucide-react';

interface SettingItem {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || []);
        const vals: Record<string, string> = {};
        (data.settings || []).forEach((s: SettingItem) => {
          vals[s.key] = s.value;
        });
        setFormValues(vals);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSetting = async (key: string, value: string) => {
    setSaveLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update setting.');

      setFeedback({ message: `Setting "${key}" updated successfully.`, type: 'success' });
      fetchSettings();
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Platform Settings' }]}
      title="Global Platform Settings & Configurations"
      description="Configure business commission rules, cancellation windows, AI feature toggles, and pilot regional defaults."
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

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
          <p className="text-xs text-slate-500">Loading system parameters...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Financial & Commission Rules */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8E6] shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#E2E8E6]">
              <Percent className="w-5 h-5 text-[#0F766E]" />
              <div>
                <h3 className="font-bold text-sm text-[#17201F]">Commission & Financial Policies</h3>
                <p className="text-xs text-[#64706E]">
                  Rules applied during customer booking and partner payout settlement
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="max-w-md">
                  <span className="font-bold text-[#17201F] block">New Customer Commission (%)</span>
                  <span className="text-[#64706E]">
                    Standard platform commission deducted for first-time customer appointments (Configured default: 7.0%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={formValues['COMMISSION_NEW_CUSTOMER'] || '7.0'}
                    onChange={(e) =>
                      setFormValues({ ...formValues, COMMISSION_NEW_CUSTOMER: e.target.value })
                    }
                    className="w-24 px-3 py-1.5 border border-[#E2E8E6] rounded-lg font-bold text-right"
                  />
                  <button
                    onClick={() =>
                      handleSaveSetting(
                        'COMMISSION_NEW_CUSTOMER',
                        formValues['COMMISSION_NEW_CUSTOMER']
                      )
                    }
                    disabled={saveLoading}
                    className="px-3 py-1.5 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E2E8E6]">
                <div className="max-w-md">
                  <span className="font-bold text-[#17201F] block">Repeat Customer Commission (%)</span>
                  <span className="text-[#64706E]">
                    Lower commission incentivizing salon retention for recurring clients (Configured default: 2.0%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={formValues['COMMISSION_REPEAT_CUSTOMER'] || '2.0'}
                    onChange={(e) =>
                      setFormValues({ ...formValues, COMMISSION_REPEAT_CUSTOMER: e.target.value })
                    }
                    className="w-24 px-3 py-1.5 border border-[#E2E8E6] rounded-lg font-bold text-right"
                  />
                  <button
                    onClick={() =>
                      handleSaveSetting(
                        'COMMISSION_REPEAT_CUSTOMER',
                        formValues['COMMISSION_REPEAT_CUSTOMER']
                      )
                    }
                    disabled={saveLoading}
                    className="px-3 py-1.5 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Booking & Cancellation Windows */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8E6] shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#E2E8E6]">
              <Clock className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="font-bold text-sm text-[#17201F]">Booking & Cancellation Windows</h3>
                <p className="text-xs text-[#64706E]">Customer policy limits before scheduled appointments</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="max-w-md">
                  <span className="font-bold text-[#17201F] block">
                    Free Cancellation Window (Hours)
                  </span>
                  <span className="text-[#64706E]">
                    Hours prior to slot appointment that customer can cancel with 100% full refund
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={formValues['CANCELLATION_WINDOW_HOURS'] || '2'}
                    onChange={(e) =>
                      setFormValues({ ...formValues, CANCELLATION_WINDOW_HOURS: e.target.value })
                    }
                    className="w-24 px-3 py-1.5 border border-[#E2E8E6] rounded-lg font-bold text-right"
                  />
                  <button
                    onClick={() =>
                      handleSaveSetting(
                        'CANCELLATION_WINDOW_HOURS',
                        formValues['CANCELLATION_WINDOW_HOURS']
                      )
                    }
                    disabled={saveLoading}
                    className="px-3 py-1.5 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Feature Toggles */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8E6] shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#E2E8E6]">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="font-bold text-sm text-[#17201F]">AI Capabilities & Recommendation Flags</h3>
                <p className="text-xs text-[#64706E]">
                  Control client app machine learning features in Srinagar pilot
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#17201F] block">AI Style Recommendations</span>
                  <span className="text-[#64706E]">Enable personalized beauty care matching</span>
                </div>
                <button
                  onClick={() => {
                    const next = formValues['AI_RECOMMENDATIONS_ENABLED'] === 'true' ? 'false' : 'true';
                    setFormValues({ ...formValues, AI_RECOMMENDATIONS_ENABLED: next });
                    handleSaveSetting('AI_RECOMMENDATIONS_ENABLED', next);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    formValues['AI_RECOMMENDATIONS_ENABLED'] === 'true'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {formValues['AI_RECOMMENDATIONS_ENABLED'] === 'true' ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E6]">
                <div>
                  <span className="font-bold text-[#17201F] block">Virtual Hairstyle Camera Try-On</span>
                  <span className="text-[#64706E]">Enable face mesh preview in customer application</span>
                </div>
                <button
                  onClick={() => {
                    const next = formValues['AI_HAIRSTYLE_TRYON_ENABLED'] === 'true' ? 'false' : 'true';
                    setFormValues({ ...formValues, AI_HAIRSTYLE_TRYON_ENABLED: next });
                    handleSaveSetting('AI_HAIRSTYLE_TRYON_ENABLED', next);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    formValues['AI_HAIRSTYLE_TRYON_ENABLED'] === 'true'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {formValues['AI_HAIRSTYLE_TRYON_ENABLED'] === 'true' ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>

          {/* Regional & System Constants */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8E6] shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-sm text-[#17201F]">Regional Architecture Constants</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
                <span className="text-[#64706E]">Pilot Territory</span>
                <div className="font-bold text-[#17201F] text-sm mt-0.5">Srinagar, J&K</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
                <span className="text-[#64706E]">Base Currency</span>
                <div className="font-bold text-[#17201F] text-sm mt-0.5">INR (₹)</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E6]">
                <span className="text-[#64706E]">System Timezone</span>
                <div className="font-bold text-[#17201F] text-sm mt-0.5">Asia/Kolkata</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
