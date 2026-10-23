"use client";

import { create } from "zustand";

export type AppView = "home" | "discover" | "ai" | "bookings" | "profile";

export interface SelectedLook {
  id?: string;
  style: string;
  category: string;
  serviceType: string;
  serviceName?: string;
  reason?: string;
  visualPreview?: string;
  visualPreviewSource?: "reference-image" | "ai-generated" | "unavailable";
  maintenance?: "Low" | "Medium" | "High";
  duration?: string;
}

interface AppState {
  view: AppView;
  setView: (v: AppView) => void;
  savedSalons: string[];
  toggleSaved: (id: string) => void;
  comparedSalons: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;
  selectedSalon: string | null;
  setSelectedSalon: (id: string | null) => void;
  bookingSalon: string | null;
  setBookingSalon: (id: string | null) => void;
  location: string;
  setLocation: (loc: string) => void;

  // Selected AI Look
  selectedLook: SelectedLook | null;
  setSelectedLook: (look: SelectedLook | null) => void;

  // Services catalog
  servicesCatalogSalonId: string | null;
  openServicesCatalog: (salonId: string) => void;
  closeServicesCatalog: () => void;

  // Service detail
  serviceDetailSalonId: string | null;
  serviceDetailId: string | null;
  openServiceDetail: (salonId: string, serviceId: string) => void;
  closeServiceDetail: () => void;

  // Staff profile
  staffProfileSalonId: string | null;
  staffProfileId: string | null;
  openStaffProfile: (salonId: string, staffId: string) => void;
  closeStaffProfile: () => void;

  // Booking preselect
  bookingPreselectServiceId: string | null;
  bookingPreselectStaffId: string | null;
  setBookingPreselect: (serviceId: string | null, staffId?: string | null) => void;
  clearBookingPreselect: () => void;
}

const MAX_COMPARE = 3;

export const useAppStore = create<AppState>((set, get) => ({
  view: "home",
  setView: (v) => set({ view: v }),
  savedSalons: ["premium-roots", "royal-roots"],
  toggleSaved: (id) =>
    set((s) => ({
      savedSalons: s.savedSalons.includes(id)
        ? s.savedSalons.filter((x) => x !== id)
        : [...s.savedSalons, id],
    })),
  comparedSalons: [],
  toggleCompare: (id) => {
    const list = get().comparedSalons;
    if (list.includes(id)) {
      set({ comparedSalons: list.filter((x) => x !== id) });
    } else if (list.length < MAX_COMPARE) {
      set({ comparedSalons: [...list, id], compareOpen: true });
    }
  },
  clearCompare: () => set({ comparedSalons: [], compareOpen: false }),
  compareOpen: false,
  setCompareOpen: (open) => set({ compareOpen: open }),
  selectedSalon: null,
  setSelectedSalon: (id) => set({ selectedSalon: id }),
  bookingSalon: null,
  setBookingSalon: (id) => set({ bookingSalon: id }),
  location: "Srinagar",
  setLocation: (loc) => set({ location: loc }),

  selectedLook: null,
  setSelectedLook: (look) => set({ selectedLook: look }),

  servicesCatalogSalonId: null,
  openServicesCatalog: (salonId) => set({ servicesCatalogSalonId: salonId }),
  closeServicesCatalog: () => set({ servicesCatalogSalonId: null }),

  serviceDetailSalonId: null,
  serviceDetailId: null,
  openServiceDetail: (salonId, serviceId) =>
    set({ serviceDetailSalonId: salonId, serviceDetailId: serviceId }),
  closeServiceDetail: () => set({ serviceDetailSalonId: null, serviceDetailId: null }),

  staffProfileSalonId: null,
  staffProfileId: null,
  openStaffProfile: (salonId, staffId) =>
    set({ staffProfileSalonId: salonId, staffProfileId: staffId }),
  closeStaffProfile: () => set({ staffProfileSalonId: null, staffProfileId: null }),

  bookingPreselectServiceId: null,
  bookingPreselectStaffId: null,
  setBookingPreselect: (serviceId, staffId) =>
    set({ bookingPreselectServiceId: serviceId, bookingPreselectStaffId: staffId ?? null }),
  clearBookingPreselect: () =>
    set({ bookingPreselectServiceId: null, bookingPreselectStaffId: null }),
}));
