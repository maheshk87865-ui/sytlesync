'use client';
import { useState } from 'react';
import { useSalonStore } from '@/lib/store';
import { Sidebar } from '@/components/salon/Sidebar';
import { MobileNav } from '@/components/salon/MobileNav';
import { TopBar } from '@/components/salon/TopBar';
import { DashboardView } from '@/components/salon/views/DashboardView';
import { BookingsView } from '@/components/salon/views/BookingsView';
import { CalendarView } from '@/components/salon/views/CalendarView';
import { ServicesView } from '@/components/salon/views/ServicesView';
import { StaffView } from '@/components/salon/views/StaffView';
import { AvailabilityView } from '@/components/salon/views/AvailabilityView';
import { CustomersView } from '@/components/salon/views/CustomersView';
import { ReviewsView } from '@/components/salon/views/ReviewsView';
import { AnalyticsView } from '@/components/salon/views/AnalyticsView';
import { PaymentsView } from '@/components/salon/views/PaymentsView';
import { NotificationsView } from '@/components/salon/views/NotificationsView';
import { ProfileView } from '@/components/salon/views/ProfileView';
import { SupportView } from '@/components/salon/views/SupportView';
import { SettingsView } from '@/components/salon/views/SettingsView';
import type { ViewKey } from '@/lib/types';

const VIEWS: Record<ViewKey, React.ComponentType> = {
  dashboard: DashboardView,
  bookings: BookingsView,
  calendar: CalendarView,
  services: ServicesView,
  staff: StaffView,
  availability: AvailabilityView,
  customers: CustomersView,
  reviews: ReviewsView,
  analytics: AnalyticsView,
  payments: PaymentsView,
  notifications: NotificationsView,
  profile: ProfileView,
  support: SupportView,
  settings: SettingsView,
};

export function SalonAppShell() {
  const currentView = useSalonStore(s => s.currentView);
  const ViewComponent = VIEWS[currentView];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-8 max-w-[1400px] w-full mx-auto">
          <ViewComponent />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
