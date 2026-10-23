'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Modal } from '@/components/common/Modal';
import {
  MapPin,
  Plus,
  RotateCw,
  Building2,
  CheckCircle,
  XCircle,
  Compass,
  Globe2,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Location {
  id: string;
  cityName: string;
  localityName: string;
  state: string;
  postalCode: string;
  isActive: boolean;
  salonCount: number;
}

const CITY_PRESETS = [
  { cityName: 'Srinagar', state: 'Jammu and Kashmir', pinPrefix: '190001', tag: 'PILOT HUB' },
  { cityName: 'Jammu', state: 'Jammu and Kashmir', pinPrefix: '180004', tag: 'REGIONAL HUB' },
  { cityName: 'Delhi NCR', state: 'Delhi', pinPrefix: '110001', tag: 'TIER-1 CAPITAL' },
  { cityName: 'Mumbai', state: 'Maharashtra', pinPrefix: '400050', tag: 'FINANCIAL CAPITAL' },
  { cityName: 'Bengaluru', state: 'Karnataka', pinPrefix: '560038', tag: 'TECH CAPITAL' },
  { cityName: 'Chandigarh', state: 'Chandigarh', pinPrefix: '160017', tag: 'NORTH HUB' },
  { cityName: 'Jaipur', state: 'Rajasthan', pinPrefix: '302001', tag: 'WEST HUB' },
  { cityName: 'Hyderabad', state: 'Telangana', pinPrefix: '500034', tag: 'SOUTH HUB' },
  { cityName: 'Kolkata', state: 'West Bengal', pinPrefix: '700016', tag: 'EAST HUB' },
];

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');

  // Add Location Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLocality, setNewLocality] = useState({
    cityName: 'Srinagar',
    localityName: '',
    state: 'Jammu and Kashmir',
    postalCode: '190001',
  });
  const [addLoading, setAddLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, salonRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/salons?limit=150'),
      ]);
      if (locRes.ok) {
        const data = await locRes.json();
        setLocations(data.locations || []);
      }
      if (salonRes.ok) {
        const salonData = await salonRes.json();
        setSalons(salonData.salons || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleLocationActive = async (loc: Location) => {
    try {
      await fetch('/api/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loc.id, isActive: !loc.isActive }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCityPresetChange = (cityName: string) => {
    const preset = CITY_PRESETS.find((p) => p.cityName === cityName);
    if (preset) {
      setNewLocality((prev) => ({
        ...prev,
        cityName: preset.cityName,
        state: preset.state,
        postalCode: preset.pinPrefix,
      }));
    } else {
      setNewLocality((prev) => ({ ...prev, cityName }));
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocality),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewLocality({
          cityName: 'Srinagar',
          localityName: '',
          state: 'Jammu and Kashmir',
          postalCode: '190001',
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddLoading(false);
    }
  };

  // Distinct cities list from loaded locations
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => set.add(l.cityName));
    return Array.from(set).sort();
  }, [locations]);

  // City-level aggregated statistics
  const cityMetrics = useMemo(() => {
    const map: Record<string, { localitiesCount: number; activeSalonsCount: number; state: string }> = {};
    locations.forEach((loc) => {
      if (!map[loc.cityName]) {
        map[loc.cityName] = { localitiesCount: 0, activeSalonsCount: 0, state: loc.state };
      }
      map[loc.cityName].localitiesCount += 1;
    });
    salons.forEach((s) => {
      if (map[s.city]) {
        map[s.city].activeSalonsCount += 1;
      }
    });
    return map;
  }, [locations, salons]);

  // Filtered locations grid
  const filteredLocations = useMemo(() => {
    if (selectedCityFilter === 'ALL') return locations;
    return locations.filter((loc) => loc.cityName === selectedCityFilter);
  }, [locations, selectedCityFilter]);

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Locations & Pilot' }]}
      title="Pan-India Territory & City Management"
      description="Manage active operational service boundaries, partner hubs, and expansion territory definitions across India."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Service Locality
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Locations"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* 1. Pan-India Hubs Overview Cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* National Network Card */}
        <div
          onClick={() => setSelectedCityFilter('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedCityFilter === 'ALL'
              ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
              : 'bg-white text-[#17201F] border-[#E2E8E6] hover:border-teal-500'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <Globe2 className={`w-4 h-4 ${selectedCityFilter === 'ALL' ? 'text-teal-200' : 'text-[#0F766E]'}`} />
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                  selectedCityFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                National
              </span>
            </div>
            <h4 className="font-bold text-xs">All India Overview</h4>
            <p className={`text-[10px] mt-0.5 ${selectedCityFilter === 'ALL' ? 'text-teal-100' : 'text-[#64706E]'}`}>
              {locations.length} Localities • {salons.length} Salons
            </p>
          </div>
          <span className={`text-[10px] font-semibold mt-2 flex items-center gap-1 ${selectedCityFilter === 'ALL' ? 'text-white' : 'text-[#0F766E]'}`}>
            View All →
          </span>
        </div>

        {/* Individual City Hub Cards */}
        {CITY_PRESETS.map((preset) => {
          const stats = cityMetrics[preset.cityName] || { localitiesCount: 0, activeSalonsCount: 0 };
          const isSelected = selectedCityFilter === preset.cityName;

          return (
            <div
              key={preset.cityName}
              onClick={() => setSelectedCityFilter(preset.cityName)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-teal-50/80 border-[#0F766E] ring-1 ring-[#0F766E] shadow-xs'
                  : 'bg-white border-[#E2E8E6] hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                    {preset.tag}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-[#17201F]">{preset.cityName}</h4>
                <p className="text-[10px] text-[#64706E] mt-0.5">
                  {stats.localitiesCount} Localities • {stats.activeSalonsCount} Salons
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[#0F766E] mt-2 flex items-center gap-1">
                Filter Localities →
              </span>
            </div>
          );
        })}
      </div>

      {/* Localities Section Header & City Filter Strip */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#17201F] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0F766E]" />
            <span>Service Localities Directory ({filteredLocations.length})</span>
          </h3>
          <p className="text-xs text-[#64706E] mt-0.5">
            Operational service zones enabled for customer bookings and stylist assignments.
          </p>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCityFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer ${
              selectedCityFilter === 'ALL'
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-white border border-[#E2E8E6] text-[#64706E] hover:bg-slate-50'
            }`}
          >
            All Cities ({locations.length})
          </button>
          {availableCities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCityFilter(city)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer ${
                selectedCityFilter === city
                  ? 'bg-[#0F766E] text-white shadow-2xs'
                  : 'bg-white border border-[#E2E8E6] text-[#64706E] hover:bg-slate-50'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Localities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && locations.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-xs text-slate-500" suppressHydrationWarning>
            <LoadingSpinner size="lg" className="mx-auto mb-2" />
            Loading active operational localities across India...
          </div>
        ) : (
          filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#17201F]">{loc.localityName}</h4>
                    <span className="text-[11px] font-semibold text-[#0F766E]">{loc.cityName}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      loc.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {loc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-[#64706E] mt-1.5">
                  {loc.state} • PIN: <strong className="text-slate-700">{loc.postalCode}</strong>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8E6] flex items-center justify-between text-xs">
                <span className="text-[#64706E]">
                  Salons: <strong className="text-[#17201F]">{loc.salonCount || 1}</strong>
                </span>
                <button
                  onClick={() => toggleLocationActive(loc)}
                  className={`px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${
                    loc.isActive
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {loc.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Add Locality Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Service Locality"
        description="Register a new commercial or residential locality for partner onboarding across India."
      >
        <form onSubmit={handleAddLocation} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Target City</label>
            <select
              value={newLocality.cityName}
              onChange={(e) => handleCityPresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg bg-white text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            >
              {CITY_PRESETS.map((p) => (
                <option key={p.cityName} value={p.cityName}>
                  {p.cityName} ({p.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Locality Name</label>
            <input
              type="text"
              required
              value={newLocality.localityName}
              onChange={(e) => setNewLocality({ ...newLocality, localityName: e.target.value })}
              placeholder="e.g. Connaught Place, Bandra West, Rajbagh"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">State / UT</label>
              <input
                type="text"
                required
                value={newLocality.state}
                onChange={(e) => setNewLocality({ ...newLocality, state: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Postal Code (PIN)</label>
              <input
                type="text"
                required
                value={newLocality.postalCode}
                onChange={(e) => setNewLocality({ ...newLocality, postalCode: e.target.value })}
                placeholder="190001"
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {addLoading ? 'Saving...' : 'Add Locality'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
