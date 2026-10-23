'use client';
import { useSalonStore } from '@/lib/store';
import type { ViewKey } from '@/lib/types';
import { LayoutDashboard, CalendarDays, Scissors, MoreHorizontal, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const PRIMARY_NAV: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'bookings', label: 'Bookings', icon: CalendarDays },
  { key: 'calendar', label: 'Calendar', icon: LayoutDashboard },
  { key: 'services', label: 'Services', icon: Scissors },
];

const MORE_NAV: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'staff', label: 'Staff', icon: MoreHorizontal },
  { key: 'availability', label: 'Availability', icon: MoreHorizontal },
  { key: 'customers', label: 'Customers', icon: MoreHorizontal },
  { key: 'reviews', label: 'Reviews', icon: MoreHorizontal },
  { key: 'analytics', label: 'Analytics', icon: MoreHorizontal },
  { key: 'payments', label: 'Payments', icon: MoreHorizontal },
  { key: 'notifications', label: 'Notifications', icon: MoreHorizontal },
  { key: 'profile', label: 'Profile', icon: MoreHorizontal },
  { key: 'support', label: 'Support', icon: MoreHorizontal },
  { key: 'settings', label: 'Settings', icon: MoreHorizontal },
];

export function MobileNav() {
  const currentView = useSalonStore(s => s.currentView);
  const setView = useSalonStore(s => s.setView);
  const resetBookingFilter = useSalonStore(s => s.resetBookingFilter);
  const resetPaymentFilter = useSalonStore(s => s.resetPaymentFilter);
  const [open, setOpen] = useState(false);

  const moreNav = MORE_NAV;

  const handleNavClick = (key: any) => {
    if (key === 'bookings') resetBookingFilter();
    if (key === 'payments') resetPaymentFilter();
    setView(key);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-50 px-2 py-1.5 flex items-center justify-around shadow-md">
      {PRIMARY_NAV.map(item => {
        const Icon = item.icon;
        const active = currentView === item.key;
        return (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors min-w-[64px]',
              active ? 'text-[#087F68] font-bold' : 'text-[#6B7280] hover:text-[#1F2937]'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors min-w-[64px]',
            MORE_NAV.some(m => m.key === currentView) ? 'text-[#087F68] font-bold' : 'text-[#6B7280] hover:text-[#1F2937]'
          )}>
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] p-0 bg-white border-[#E5E7EB] text-[#1F2937]">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-[#E5E7EB]">
            <SheetTitle className="text-[#1F2937]">All sections</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(70vh-80px)] px-3 pb-5 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {moreNav.map(item => {
                const active = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { handleNavClick(item.key); setOpen(false); }}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium transition-colors border',
                      active ? 'bg-[#0D513F] text-white border-[#0D513F] font-semibold' : 'bg-white text-[#1F2937] hover:bg-[#F3F4F6] border-[#E5E7EB]'
                    )}
                  >
                    <span className="font-semibold text-base">{item.label.charAt(0)}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
