'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { MetricCard } from '@/components/common/MetricCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import {
  Users,
  Building2,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Sparkles,
  ArrowUpRight,
  Activity,
  ChevronRight,
  Receipt,
  Scissors,
  Filter,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Globe2,
  MapPin,
  ChevronLeft,
  Calendar,
  RefreshCw,
  Info,
} from 'lucide-react';

const CATEGORY_STATUS_OPTIONS: Record<string, { label: string; value: string }[]> = {
  COMPLETE_DASHBOARD: [{ label: 'All Statuses', value: 'ALL' }],
  CUSTOMERS: [
    { label: 'All Customer Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' },
  ],
  SALONS: [
    { label: 'All Salon Statuses', value: 'ALL' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Pending Review', value: 'PENDING' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Suspended', value: 'SUSPENDED' },
  ],
  SALON_APPLICATIONS: [
    { label: 'Pending Review', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ],
  GLOBAL_SERVICES: [
    { label: 'All Services', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ],
  SALON_SERVICES: [
    { label: 'All Offerings', value: 'ALL' },
    { label: 'Available', value: 'AVAILABLE' },
  ],
  BOOKINGS: [
    { label: 'All Booking Statuses', value: 'ALL' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'No-Show', value: 'NO_SHOW' },
  ],
  CALENDAR: [
    { label: 'All Schedules', value: 'ALL' },
    { label: 'Upcoming', value: 'CONFIRMED' },
    { label: 'Completed', value: 'COMPLETED' },
  ],
  PAYMENTS: [
    { label: 'All Payment Statuses', value: 'ALL' },
    { label: 'Paid (Success)', value: 'SUCCESS' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Refunded', value: 'REFUNDED' },
    { label: 'Failed', value: 'FAILED' },
  ],
  GBV: [{ label: 'All Bookings', value: 'ALL' }],
  COLLECTIONS: [{ label: 'Successful Collections', value: 'SUCCESS' }],
  COMMISSIONS: [{ label: 'Collected Commissions', value: 'SUCCESS' }],
  SALON_PAYABLES: [{ label: 'Settled / Due Payables', value: 'SUCCESS' }],
  REFUNDS: [
    { label: 'All Refunds', value: 'ALL' },
    { label: 'Processed', value: 'PROCESSED' },
    { label: 'Pending', value: 'PENDING' },
  ],
  REVIEWS: [
    { label: 'All Reviews', value: 'ALL' },
    { label: 'Reported / Flagged', value: 'REPORTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
  ],
  SUPPORT_TICKETS: [
    { label: 'All Tickets', value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' },
  ],
  NOTIFICATIONS: [
    { label: 'All Notifications', value: 'ALL' },
    { label: 'Unread', value: 'UNREAD' },
  ],
  AI_OPERATIONS: [
    { label: 'All Invocations', value: 'ALL' },
    { label: 'Success', value: 'SUCCESS' },
    { label: 'Failed', value: 'FAILED' },
  ],
  ANALYTICS: [{ label: 'All Aggregates', value: 'ALL' }],
};

export default function DashboardPage() {
  // 1. Filter States
  const [scopeType, setScopeType] = useState('ALL_LOCATIONS');
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedLocality, setSelectedLocality] = useState('ALL');

  const [category, setCategory] = useState('COMPLETE_DASHBOARD');
  const [dateRange, setDateRange] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Data States
  const [metricsData, setMetricsData] = useState<any>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Database Connection Health State
  const [dbHealth, setDbHealth] = useState<{
    status: 'Connected' | 'Disconnected' | 'Degraded' | 'Checking';
    latencyMs?: number;
  }>({ status: 'Checking' });

  // Detail Modal State
  const [inspectRecord, setInspectRecord] = useState<any>(null);

  // 3. Database Health Check
  const checkDatabaseHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const json = await res.json();
        setDbHealth({ status: 'Connected', latencyMs: json.latencyMs });
      } else {
        setDbHealth({ status: 'Disconnected' });
      }
    } catch {
      setDbHealth({ status: 'Disconnected' });
    }
  }, []);

  useEffect(() => {
    checkDatabaseHealth();
    const interval = setInterval(checkDatabaseHealth, 30000);
    return () => clearInterval(interval);
  }, [checkDatabaseHealth]);

  // 4. Fetch Metrics Aggregate
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope: scopeType,
        country: selectedCountry,
        state: selectedState,
        city: selectedCity,
        locality: selectedLocality,
        dateRange,
      });
      if (dateRange === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      const res = await fetch(`/api/dashboard/metrics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMetricsData(json);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {
      console.error('Failed to fetch dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  }, [scopeType, selectedCountry, selectedState, selectedCity, selectedLocality, dateRange, startDate, endDate]);

  // 5. Fetch Table Data for Specific Category
  const fetchTableData = useCallback(async () => {
    if (category === 'COMPLETE_DASHBOARD') return;
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        state: selectedState,
        city: selectedCity,
        locality: selectedLocality,
        status: statusFilter,
        dateRange,
        search: searchQuery,
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (dateRange === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      const res = await fetch(`/api/dashboard/explorer?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTableData(json);
      }
    } catch (e) {
      console.error('Failed to fetch explorer table data:', e);
    } finally {
      setTableLoading(false);
    }
  }, [category, selectedState, selectedCity, selectedLocality, statusFilter, dateRange, startDate, endDate, searchQuery, page, pageSize]);

  // Trigger data updates
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    setPage(1);
    fetchTableData();
  }, [fetchTableData]);

  // 6. Reset Filters to default
  const handleResetFilters = () => {
    setScopeType('ALL_LOCATIONS');
    setSelectedCountry('India');
    setSelectedState('ALL');
    setSelectedCity('ALL');
    setSelectedLocality('ALL');
    setCategory('COMPLETE_DASHBOARD');
    setDateRange('30days');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setSearchQuery('');
    setPage(1);
  };

  // 7. Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams({
      category: category === 'COMPLETE_DASHBOARD' ? 'BOOKINGS' : category,
      state: selectedState,
      city: selectedCity,
      locality: selectedLocality,
      status: statusFilter,
      dateRange,
      search: searchQuery,
      format: 'csv',
    });
    if (dateRange === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    window.open(`/api/dashboard/explorer?${params.toString()}`, '_blank');
  };

  // 8. Dependent Dropdown Options from Real Location Records
  const hierarchy = metricsData?.locationHierarchy?.India?.states || {};
  const availableStates = useMemo(() => Object.keys(hierarchy).sort(), [hierarchy]);

  const availableCities = useMemo(() => {
    if (selectedState === 'ALL') {
      const set = new Set<string>();
      Object.values(hierarchy).forEach((sObj: any) => {
        Object.keys(sObj.cities || {}).forEach((c) => set.add(c));
      });
      return Array.from(set).sort();
    }
    return Object.keys(hierarchy[selectedState]?.cities || {}).sort();
  }, [hierarchy, selectedState]);

  const availableLocalities = useMemo(() => {
    if (selectedCity === 'ALL') {
      return [];
    }
    if (selectedState !== 'ALL' && hierarchy[selectedState]?.cities?.[selectedCity]) {
      return (hierarchy[selectedState].cities[selectedCity] || []).sort();
    }
    for (const sName of Object.keys(hierarchy)) {
      if (hierarchy[sName]?.cities?.[selectedCity]) {
        return (hierarchy[sName].cities[selectedCity] || []).sort();
      }
    }
    return [];
  }, [hierarchy, selectedState, selectedCity]);

  // Dynamic Scope Summary String
  const scopeSummary = useMemo(() => {
    let loc = 'All Locations (Pan-India)';
    if (scopeType === 'UNASSIGNED') loc = 'Unassigned Locations';
    else if (selectedLocality !== 'ALL') loc = `${selectedCity} → ${selectedLocality}`;
    else if (selectedCity !== 'ALL') loc = `${selectedCity}`;
    else if (selectedState !== 'ALL') loc = `${selectedState}`;

    const catLabel =
      category === 'COMPLETE_DASHBOARD'
        ? 'Complete Dashboard'
        : category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    const rangeLabel =
      dateRange === 'custom'
        ? `${startDate || 'Start'} to ${endDate || 'Now'}`
        : dateRange === '30days'
        ? 'Last 30 Days'
        : dateRange === '90days'
        ? 'Last 90 Days'
        : dateRange === '7days'
        ? 'Last 7 Days'
        : dateRange === 'today'
        ? 'Today'
        : dateRange === 'yesterday'
        ? 'Yesterday'
        : dateRange === 'thismonth'
        ? 'This Month'
        : dateRange === 'lastmonth'
        ? 'Previous Month'
        : dateRange === 'thisyear'
        ? 'This Year'
        : dateRange === 'all'
        ? 'All Time'
        : dateRange;

    const statLabel = statusFilter === 'ALL' ? 'All Statuses' : statusFilter;

    return `Showing: ${loc} | ${catLabel} | ${rangeLabel} | ${statLabel}`;
  }, [scopeType, selectedState, selectedCity, selectedLocality, category, dateRange, startDate, endDate, statusFilter]);

  const m = metricsData?.metrics;

  return (
    <AdminShell
      title="Platform Dashboard & Scope Explorer"
      description="Live administrative intelligence, dynamic territory scoping, and multi-city analytics."
      actions={
        <div className="flex items-center gap-2">
          {/* Live DB Health Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              dbHealth.status === 'Connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : dbHealth.status === 'Checking'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
            title="Real-time SQLite database health check"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dbHealth.status === 'Connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : dbHealth.status === 'Checking'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>DB: {dbHealth.status}</span>
            {dbHealth.latencyMs !== undefined && (
              <span className="text-[10px] text-slate-500 font-normal">({dbHealth.latencyMs}ms)</span>
            )}
          </div>

          <button
            onClick={() => {
              fetchMetrics();
              fetchTableData();
            }}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Real-time Data"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* 1. DYNAMIC PLATFORM SCOPE & DATA EXPLORER CONTROL PANEL */}
      <div className="mb-6 rounded-2xl bg-[#0F766E]/95 border border-[#115E59] text-white p-4 sm:p-5 shadow-lg backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-teal-600/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-[#CCFBF1]" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide flex items-center gap-2">
                <span>Platform Scope & Data Explorer</span>
                <span className="text-[10px] bg-[#CCFBF1] text-[#0F766E] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Active
                </span>
              </h2>
              <p className="text-[11px] text-teal-100/90 mt-0.5">
                Multi-City Filtering • Commission Reconciliations • Live Database Queries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-teal-100 self-end sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-teal-200" />
            <span>Updated: {lastUpdated || 'Live'}</span>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-[#17201F]">
          {/* A. Geographic Scope Type */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1 flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-[#CCFBF1]" /> Scope Level:
            </label>
            <select
              value={scopeType}
              onChange={(e) => {
                const s = e.target.value;
                setScopeType(s);
                if (s === 'ALL_LOCATIONS' || s === 'UNASSIGNED') {
                  setSelectedState('ALL');
                  setSelectedCity('ALL');
                  setSelectedLocality('ALL');
                } else if (s === 'STATE') {
                  setSelectedCity('ALL');
                  setSelectedLocality('ALL');
                } else if (s === 'CITY') {
                  setSelectedLocality('ALL');
                }
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              <option value="ALL_LOCATIONS">All Locations (Pan-India)</option>
              <option value="STATE">State / Region</option>
              <option value="CITY">City</option>
              <option value="LOCALITY">Locality / Area</option>
              <option value="UNASSIGNED">Unassigned Location Records</option>
            </select>
          </div>

          {/* B. Dependent State / Region */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1">State / Region:</label>
            <select
              value={selectedState}
              disabled={scopeType === 'ALL_LOCATIONS' || scopeType === 'UNASSIGNED'}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('ALL');
                setSelectedLocality('ALL');
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium disabled:opacity-50 focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              <option value="ALL">All States</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* C. Dependent City */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#CCFBF1]" /> City:
            </label>
            <select
              value={selectedCity}
              disabled={scopeType === 'ALL_LOCATIONS' || scopeType === 'UNASSIGNED' || scopeType === 'STATE'}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedLocality('ALL');
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium disabled:opacity-50 focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              <option value="ALL">All Cities in Scope</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* D. Dependent Locality */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1">Locality / Area:</label>
            <select
              value={selectedLocality}
              disabled={
                scopeType !== 'LOCALITY' ||
                selectedCity === 'ALL' ||
                availableLocalities.length === 0
              }
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium disabled:opacity-50 focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              {scopeType !== 'LOCALITY' ? (
                <option value="ALL">Disabled (Scope is not Locality)</option>
              ) : selectedCity === 'ALL' ? (
                <option value="ALL">Select a city first</option>
              ) : availableLocalities.length === 0 ? (
                <option value="ALL">No localities for {selectedCity}</option>
              ) : (
                <>
                  <option value="ALL">All Localities</option>
                  {availableLocalities.map((loc: string) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* E. View Data Category */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1">View Data (Category):</label>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategory(newCat);
                setStatusFilter('ALL');
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              <option value="COMPLETE_DASHBOARD">Complete Dashboard</option>
              <option value="CUSTOMERS">Customers</option>
              <option value="SALONS">Salons</option>
              <option value="SALON_APPLICATIONS">Salon Applications</option>
              <option value="GLOBAL_SERVICES">Global Services</option>
              <option value="SALON_SERVICES">Salon Service Offerings</option>
              <option value="BOOKINGS">Bookings</option>
              <option value="CALENDAR">Calendar & Availability</option>
              <option value="PAYMENTS">Payments</option>
              <option value="GBV">Gross Booking Value</option>
              <option value="COLLECTIONS">Collections</option>
              <option value="COMMISSIONS">Platform Commission</option>
              <option value="SALON_PAYABLES">Salon Payables</option>
              <option value="REFUNDS">Refunds</option>
              <option value="REVIEWS">Reviews & Reports</option>
              <option value="SUPPORT_TICKETS">Support Tickets</option>
              <option value="NOTIFICATIONS">Notifications</option>
              <option value="AI_OPERATIONS">AI Operations</option>
              <option value="ANALYTICS">Analytics & Reports</option>
            </select>
          </div>

          {/* F. Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#CCFBF1]" /> Date Range:
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              <option value="30days">Last 30 Days</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="thismonth">This Month</option>
              <option value="lastmonth">Previous Month</option>
              <option value="thisyear">This Year</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* G. Category-Specific Status */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1">Record Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            >
              {(CATEGORY_STATUS_OPTIONS[category] || CATEGORY_STATUS_OPTIONS.COMPLETE_DASHBOARD).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* H. Search query */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-100 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-[#CCFBF1]" /> Search Query:
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, ref..."
              className="w-full px-2.5 py-1.5 bg-white border border-teal-700/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#CCFBF1] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Custom Date Range Row (Visible when Custom is chosen) */}
        {dateRange === 'custom' && (
          <div className="mt-3 pt-3 border-t border-teal-600/40 flex items-center gap-3 text-xs text-[#17201F]">
            <span className="text-teal-100 font-semibold text-xs">Custom Dates:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-teal-700/50 rounded-lg text-xs"
            />
            <span className="text-teal-200">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-teal-700/50 rounded-lg text-xs"
            />
          </div>
        )}

        {/* Action Controls & Scope Summary Strip */}
        <div className="mt-4 pt-3 border-t border-teal-600/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                fetchMetrics();
                fetchTableData();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white text-[#0F766E] hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Filter className="w-3.5 h-3.5" /> Apply Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-teal-100 hover:text-white font-medium text-xs transition-colors cursor-pointer border border-teal-600/50"
            >
              Reset Filters
            </button>
            <button
              onClick={() => {
                fetchMetrics();
                fetchTableData();
              }}
              className="px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-teal-100 hover:text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 border border-teal-600/50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-teal-100 hover:text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 border border-teal-600/50"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Scope Summary Badge */}
          <div className="text-[11px] text-white/90 bg-teal-800/60 px-3 py-1.5 rounded-xl border border-teal-500/30 truncate max-w-xl">
            {scopeSummary}
          </div>
        </div>
      </div>

      {/* 2. COMPLETE DASHBOARD OVERVIEW OR CATEGORY TABLE MODE */}
      {category === 'COMPLETE_DASHBOARD' ? (
        <>
          {/* KPI Cards: Row 1 - Customer & Salon Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div onClick={() => setCategory('CUSTOMERS')} className="cursor-pointer">
              <MetricCard
                title="Total Customers"
                value={m?.customers?.total ?? '...'}
                subtitle={`${m?.customers?.active ?? 0} active • ${m?.customers?.returning ?? 0} repeat`}
                icon={Users}
                badge={selectedCity !== 'ALL' ? selectedCity : 'Pan-India'}
                colorScheme="teal"
              />
            </div>
            <div
              onClick={() => {
                setCategory('SALONS');
                if (m?.salons?.pending > 0) setStatusFilter('PENDING');
              }}
              className="cursor-pointer"
            >
              <MetricCard
                title="Salons Registered"
                value={m?.salons?.total ?? '...'}
                subtitle={`${m?.salons?.approved ?? 0} approved • ${m?.salons?.pending ?? 0} pending review`}
                icon={Building2}
                badge={m?.salons?.pending ? `${m.salons.pending} Pending` : undefined}
                colorScheme="emerald"
              />
            </div>
            <div onClick={() => setCategory('BOOKINGS')} className="cursor-pointer">
              <MetricCard
                title="Platform Bookings"
                value={m?.bookings?.total ?? '...'}
                subtitle={`${m?.bookings?.upcoming ?? 0} upcoming • ${m?.bookings?.completed ?? 0} completed`}
                icon={CalendarCheck}
                colorScheme="sky"
              />
            </div>
            <div onClick={() => setCategory('PAYMENTS')} className="cursor-pointer">
              <MetricCard
                title="Gross Booking Value"
                value={`₹${(m?.finance?.grossBookingValue ?? 0).toLocaleString('en-IN')}`}
                subtitle={`₹${(m?.finance?.paymentsCollected ?? 0).toLocaleString('en-IN')} collected`}
                icon={CreditCard}
                trend={{ value: '+14.2%', isPositive: true }}
                colorScheme="amber"
              />
            </div>
          </div>

          {/* KPI Cards: Row 2 - Finance & Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div onClick={() => setCategory('COMMISSIONS')} className="cursor-pointer">
              <MetricCard
                title="Platform Commission"
                value={`₹${(m?.finance?.platformCommission ?? 0).toLocaleString('en-IN')}`}
                subtitle="7% new • 2% repeat customer bookings"
                icon={TrendingUp}
                colorScheme="teal"
              />
            </div>
            <div onClick={() => setCategory('SALON_PAYABLES')} className="cursor-pointer">
              <MetricCard
                title="Salon Payable Amount"
                value={`₹${(m?.finance?.salonPayable ?? 0).toLocaleString('en-IN')}`}
                subtitle="Net payout due to salon partners"
                icon={Receipt}
                colorScheme="emerald"
              />
            </div>
            <div onClick={() => setCategory('SUPPORT_TICKETS')} className="cursor-pointer">
              <MetricCard
                title="Open Support Tickets"
                value={m?.operational?.openSupportTickets ?? '0'}
                subtitle="Customer & Salon inquiries"
                icon={AlertTriangle}
                badge={m?.operational?.openSupportTickets > 0 ? 'Needs Attention' : undefined}
                colorScheme="rose"
              />
            </div>
            <div onClick={() => setCategory('REVIEWS')} className="cursor-pointer">
              <MetricCard
                title="Reported Reviews"
                value={m?.operational?.reportedReviews ?? '0'}
                subtitle="Flagged by salon partners or users"
                icon={Scissors}
                badge={m?.operational?.reportedReviews > 0 ? 'Pending Review' : undefined}
                colorScheme="slate"
              />
            </div>
          </div>

          {/* Visual Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Booking & Revenue Daily Trend Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#17201F]">
                    Booking & Revenue Trajectory ({dateRange === '7days' ? '7-Day' : '14-Day'})
                  </h3>
                  <p className="text-xs text-[#64706E]">
                    Aggregate transaction velocity within active scope ({scopeType})
                  </p>
                </div>
                <Link
                  href="/analytics"
                  className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
                >
                  Detailed Analytics <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Trend Bar Chart */}
              <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-[#E2E8E6]">
                {metricsData?.charts?.dailyTrends?.map((day: any, idx: number) => {
                  const maxRev = Math.max(...metricsData.charts.dailyTrends.map((d: any) => d.revenue || 1));
                  const heightPct = Math.max(12, Math.round((day.revenue / (maxRev || 1)) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                        <span className="font-bold">{day.label}</span>
                        <span>
                          {day.bookings} bookings • ₹{day.revenue.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-full flex items-end justify-center h-48">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[28px] bg-gradient-to-t from-[#0F766E] to-[#14B8A6] rounded-t-md group-hover:brightness-110 transition-all cursor-pointer relative"
                        >
                          {day.bookings > 0 && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#0F766E]">
                              {day.bookings}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] font-medium text-[#64706E] truncate max-w-[36px]">
                        {day.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-[#64706E] mt-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#0F766E]" />
                    <span>Gross Booking Value</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Appointment Volume</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-500">Live Aggregate Data</span>
              </div>
            </div>

            {/* Booking Status Distribution */}
            <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17201F]">Booking Status Breakdown</h3>
                <p className="text-xs text-[#64706E] mb-4">
                  Total scope volume: {m?.bookings?.total ?? 0} bookings
                </p>

                <div className="space-y-3">
                  {metricsData?.charts?.statusDistribution?.map((stat: any, idx: number) => {
                    const total = m?.bookings?.total || 1;
                    const pct = Math.round((stat.value / total) * 100);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-2 text-[#17201F]">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                            {stat.name}
                          </span>
                          <span className="text-[#64706E]">
                            {stat.value} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: stat.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E2E8E6]">
                <button
                  onClick={() => setCategory('BOOKINGS')}
                  className="w-full text-xs font-semibold text-[#0F766E] hover:underline flex items-center justify-between cursor-pointer"
                >
                  <span>Explore Bookings Table</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 3. DEDICATED DATA EXPLORER PAGINATED TABLE FOR SELECTED CATEGORY */
        <div className="bg-white rounded-2xl border border-[#E2E8E6] shadow-xs p-5 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E2E8E6]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#17201F]">
                  {category.replace(/_/g, ' ')} Directory Explorer
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold">
                  {tableData?.pagination?.total ?? 0} Records
                </span>
              </div>
              <p className="text-xs text-[#64706E] mt-0.5">{tableData?.summaryText || scopeSummary}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64706E]">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-[#E2E8E6] rounded-lg text-xs font-medium text-[#17201F]"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
                <tr>
                  {(tableData?.columns || []).map((col: any) => (
                    <th key={col.key} className="py-3 px-3.5 font-bold">
                      {col.label}
                    </th>
                  ))}
                  <th className="py-3 px-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E6]">
                {tableLoading ? (
                  <tr>
                    <td
                      colSpan={(tableData?.columns?.length || 4) + 1}
                      className="py-12 text-center text-slate-500"
                    >
                      <LoadingSpinner size="lg" className="mx-auto mb-2" />
                      Loading records from database...
                    </td>
                  </tr>
                ) : !tableData?.records || tableData.records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(tableData?.columns?.length || 4) + 1}
                      className="py-12 text-center text-slate-500"
                    >
                      No records match the active filter criteria. Try resetting or broadening the geographic scope.
                    </td>
                  </tr>
                ) : (
                  tableData.records.map((row: any, idx: number) => (
                    <tr
                      key={row.id || idx}
                      onClick={() => setInspectRecord(row)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      {tableData.columns.map((col: any) => {
                        const val = row[col.key];
                        return (
                          <td key={col.key} className="py-3 px-3.5">
                            {col.key === 'status' || col.key === 'bookingStatus' || col.key === 'applicationStatus' ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  val === 'COMPLETED' || val === 'SUCCESS' || val === 'APPROVED' || val === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : val === 'CONFIRMED'
                                    ? 'bg-sky-100 text-sky-800'
                                    : val === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {val}
                              </span>
                            ) : typeof val === 'number' && col.key.toLowerCase().includes('amount') ? (
                              <span className="font-semibold text-[#17201F]">₹{val.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-[#17201F] font-medium">{val ?? '-'}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectRecord(row);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/40 font-semibold text-[11px] transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {tableData?.pagination && tableData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E2E8E6] text-xs">
              <span className="text-[#64706E]">
                Showing page <strong className="text-[#17201F]">{tableData.pagination.page}</strong> of{' '}
                <strong className="text-[#17201F]">{tableData.pagination.totalPages}</strong> (
                {tableData.pagination.total} total matching items)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8E6] bg-white text-[#17201F] font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page >= tableData.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8E6] bg-white text-[#17201F] font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RECORD DETAIL INSPECTION MODAL */}
      <Modal
        isOpen={!!inspectRecord}
        onClose={() => setInspectRecord(null)}
        title={`${category.replace(/_/g, ' ')} Record Details`}
        description="Detailed attributes and metadata for selected authorized record."
      >
        {inspectRecord && (
          <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-[#E2E8E6]">
              {Object.entries(inspectRecord).map(([k, v]: [string, any]) => {
                if (typeof v === 'object' && v !== null) return null;
                return (
                  <div key={k} className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[#64706E] uppercase">{k}</span>
                    <p className="font-semibold text-[#17201F] break-words">{String(v ?? '-')}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectRecord(null)}
                className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#115E59]"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
