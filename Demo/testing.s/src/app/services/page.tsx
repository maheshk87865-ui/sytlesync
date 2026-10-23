'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Modal } from '@/components/common/Modal';
import {
  Sparkles,
  Search,
  Plus,
  RotateCw,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Scissors,
  Loader2,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  _count?: { services: number };
}

interface Service {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  durationMin: number;
  genderTarget: string;
  isActive: boolean;
  category: { id: string; name: string };
  _count?: { salonServices: number; bookings: number };
}

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    categoryId: '',
    basePrice: '',
    durationMin: '30',
    genderTarget: 'UNISEX',
    description: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        categoryId: selectedCategory,
        gender: selectedGender,
      });
      const res = await fetch(`/api/services?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setServices(data.services || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedGender]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const openCreateModal = () => {
    setEditingService(null);
    setFormState({
      name: '',
      categoryId: categories[0]?.id || '',
      basePrice: '',
      durationMin: '30',
      genderTarget: 'UNISEX',
      description: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Service) => {
    setEditingService(s);
    setFormState({
      name: s.name,
      categoryId: s.categoryId,
      basePrice: s.basePrice.toString(),
      durationMin: s.durationMin.toString(),
      genderTarget: s.genderTarget,
      description: s.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingService) {
        const res = await fetch('/api/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingService.id,
            ...formState,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update service.');
      } else {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formState),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create service.');
      }

      setIsModalOpen(false);
      fetchCatalog();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActiveStatus = async (s: Service) => {
    try {
      await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, isActive: !s.isActive }),
      });
      fetchCatalog();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[{ label: 'Global Services' }]}
      title="Global Service Catalog"
      description="Standardize beauty treatments, base pricing, and duration guidelines across Srinagar partner salons."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Catalog Service
          </button>
          <button
            onClick={fetchCatalog}
            className="p-2 rounded-xl border border-[#E2E8E6] bg-white text-[#64706E] hover:text-[#0F766E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Catalog"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'bg-white text-[#64706E] border border-[#E2E8E6] hover:bg-slate-50'
          }`}
        >
          All Categories ({services.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'bg-white text-[#64706E] border border-[#E2E8E6] hover:bg-slate-50'
            }`}
          >
            {c.name} ({c._count?.services || 0})
          </button>
        ))}
      </div>

      {/* Search & Gender Filter */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service name, treatments, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-xs text-[#17201F] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#64706E] whitespace-nowrap">Target Gender:</label>
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-[#E2E8E6] rounded-xl text-[#17201F] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Genders</option>
            <option value="UNISEX">Unisex</option>
            <option value="WOMEN">Women Only</option>
            <option value="MEN">Men Only</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#64706E] uppercase text-[10px] tracking-wider border-b border-[#E2E8E6]">
              <tr>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Standard Base Price</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Salons Offering</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6]">
              {loading && services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                    Loading StyleSync Global Catalog...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No services match the active filters.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#17201F] text-sm">{s.name}</div>
                      <div className="text-[10px] text-[#64706E] max-w-sm truncate mt-0.5">
                        {s.description || 'No description provided.'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#CCFBF1] text-[#0F766E] font-medium border border-[#99F6E4]">
                        {s.category.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#17201F] text-sm">
                      ₹{s.basePrice}
                    </td>
                    <td className="py-3.5 px-4 text-[#64706E]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {s.durationMin} mins
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                        {s.genderTarget}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F766E]">
                      {s._count?.salonServices || 0} salons
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8E6] bg-white text-[#0F766E] hover:bg-[#CCFBF1]/40 font-medium transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActiveStatus(s)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            s.isActive
                              ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Edit Global Service' : 'Add New Global Service'}
        description="Standard catalog definition applied across the StyleSync Srinagar ecosystem."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Service Title</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="e.g. Kashmiri Saffron Radiance Facial"
              className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Category</label>
              <select
                required
                value={formState.categoryId}
                onChange={(e) => setFormState({ ...formState, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Target Gender</label>
              <select
                value={formState.genderTarget}
                onChange={(e) => setFormState({ ...formState, genderTarget: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="UNISEX">Unisex</option>
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Base Price (INR ₹)</label>
              <input
                type="number"
                required
                min="50"
                step="50"
                value={formState.basePrice}
                onChange={(e) => setFormState({ ...formState, basePrice: e.target.value })}
                placeholder="400"
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#17201F] mb-1">Default Duration (mins)</label>
              <input
                type="number"
                required
                min="10"
                step="5"
                value={formState.durationMin}
                onChange={(e) => setFormState({ ...formState, durationMin: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#17201F] mb-1">Procedure Description</label>
            <textarea
              rows={3}
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Outline steps, consultation, and included treatments..."
              className="w-full p-2.5 border border-[#E2E8E6] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-[#E2E8E6] rounded-lg text-[#64706E] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-[#0F766E] text-white font-semibold rounded-lg hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
            >
              {formLoading
                ? 'Saving Service...'
                : editingService
                ? 'Save Changes'
                : 'Publish to Catalog'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
