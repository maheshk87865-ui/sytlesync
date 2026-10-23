'use client';
import { useSalonStore } from '@/lib/store';
import type { ViewKey } from '@/lib/types';
import { SafeImage } from './shared';
import {
  LayoutDashboard, CalendarDays, Scissors, UserRound, Calendar,
  Users, Star, BarChart3, Wallet, Bell, Store, LifeBuoy, Settings,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('SALON_OWNER' | 'SALON_MANAGER' | 'SALON_STAFF')[];
}

const ALL_NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'bookings', label: 'Bookings', icon: CalendarDays },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'services', label: 'Services', icon: Scissors, roles: ['SALON_OWNER', 'SALON_MANAGER'] },
  { key: 'staff', label: 'Staff', icon: UserRound, roles: ['SALON_OWNER', 'SALON_MANAGER'] },
  { key: 'availability', label: 'Availability', icon: Calendar },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'payments', label: 'Payments', icon: Wallet, roles: ['SALON_OWNER', 'SALON_MANAGER'] },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'profile', label: 'Profile', icon: Store, roles: ['SALON_OWNER'] },
  { key: 'support', label: 'Support', icon: LifeBuoy },
  { key: 'settings', label: 'Settings', icon: Settings, roles: ['SALON_OWNER'] },
];

const filterNav = (role: string) => ALL_NAV.filter(item => !item.roles || item.roles.includes(role as any));

export function Sidebar() {
  const currentView = useSalonStore(s => s.currentView);
  const setView = useSalonStore(s => s.setView);
  const role = useSalonStore(s => s.currentRole);
  const salon = useSalonStore(s => s.salon);
  const notifications = useSalonStore(s => s.notifications);
  const unreadCount = notifications.filter(n => !n.read).length;
  const nav = filterNav(role);
  const resetBookingFilter = useSalonStore(s => s.resetBookingFilter);
  const resetPaymentFilter = useSalonStore(s => s.resetPaymentFilter);

  const handleNavClick = (key: ViewKey) => {
    // Reset filters when the user manually clicks nav items (so they don't
    // see leftover filters from a dashboard card click)
    if (key === 'bookings') resetBookingFilter();
    if (key === 'payments') resetPaymentFilter();
    setView(key);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[#E5E7EB] bg-white text-[#1F2937] shrink-0 sticky top-0 h-screen shadow-sm">
      {/* Logo header */}
      <div className="p-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#087F68] flex items-center justify-center shrink-0 shadow-xs">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight text-[#1F2937]">StyleSync</p>
            <p className="text-xs text-[#6B7280] leading-tight font-medium">Salon Partner</p>
          </div>
        </div>
      </div>

      {/* Salon info card — white with subtle light gray border */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] shadow-xs">
          <SafeImage
            src={salon.logo}
            alt={salon.name}
            className="w-9 h-9 object-cover shrink-0"
            fallbackClassName="w-9 h-9 shrink-0 flex items-center justify-center bg-[#E6F4F1] text-[#087F68]"
            rounded="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-[#1F2937]">{salon.name}</p>
            <p className="text-xs text-[#6B7280] truncate">{salon.city}</p>
          </div>
          <span className={cn(
            'w-2 h-2 rounded-full shrink-0',
            salon.status === 'OPEN' ? 'bg-[#087F68]' : 'bg-[#DC2626]'
          )} />
        </div>
      </div>

      {/* Nav items — active dark-green #0D513F with white text, inactive #374151 and #6B7280 */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scroll-area-custom">
        <div className="space-y-1">
          {nav.map(item => {
            const Icon = item.icon;
            const active = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={cn(
                  'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative',
                  active
                    ? 'bg-[#0D513F] text-white font-semibold shadow-xs'
                    : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#1F2937]'
                )}
              >
                {/* Active indicator */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#10A88A]" />
                )}
                <Icon className={cn('w-4.5 h-4.5 shrink-0 transition-colors',
                  active ? 'text-white' : 'text-[#6B7280] group-hover:text-[#087F68]')} />
                <span className="flex-1">{item.label}</span>
                {item.key === 'notifications' && unreadCount > 0 && (
                  <span className="bg-[#DC2626] text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCount}
                  </span>
                )}
                {active && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Role badge at bottom */}
      <div className="p-4 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
          <div className="w-8 h-8 rounded-full bg-[#E6F4F1] flex items-center justify-center shrink-0 border border-[#E5E7EB]">
            <UserRound className="w-4 h-4 text-[#087F68]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#1F2937] text-xs truncate">{salon.name}</p>
            <p className="truncate text-[#6B7280] capitalize">{role.replace('SALON_', '').toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
