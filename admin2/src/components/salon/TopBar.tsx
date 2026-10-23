'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { Bell, Search, Menu, ChevronDown, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Avatar, StatusBadge, SafeImage, formatCurrency, todayStr } from './shared';

export function TopBar() {
  const salon = useSalonStore(s => s.salon);
  const setSalonStatus = useSalonStore(s => s.setSalonStatus);
  const setView = useSalonStore(s => s.setView);
  const notifications = useSalonStore(s => s.notifications);
  const currentRole = useSalonStore(s => s.currentRole);
  const setRole = useSalonStore(s => s.setRole);
  const resetData = useSalonStore(s => s.resetData);

  const bookings = useSalonStore(s => s.bookings);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const customers = useSalonStore(s => s.customers);

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const searchResults = useMemo(() => {
    if (!query.trim()) return { bookings: [], customers: [], services: [], staff: [] };
    const q = query.toLowerCase();
    return {
      bookings: bookings.filter(b =>
        b.id.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b.staffName.toLowerCase().includes(q)
      ).slice(0, 5),
      customers: customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      ).slice(0, 5),
      services: services.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      ).slice(0, 5),
      staff: staff.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      ).slice(0, 5),
    };
  }, [query, bookings, customers, services, staff]);

  const openResult = (type: string, id: string) => {
    setQuery('');
    setSearchOpen(false);
    if (type === 'booking') {
      useSalonStore.getState().selectBooking(id);
      setView('bookings');
    } else if (type === 'customer') {
      useSalonStore.getState().selectCustomer(id);
      setView('customers');
    } else if (type === 'service') {
      setView('services');
    } else if (type === 'staff') {
      useSalonStore.getState().selectStaff(id);
      setView('staff');
    }
  };

  const todayBookings = bookings.filter(b => b.date === todayStr());
  const todayRevenue = todayBookings
    .filter(b => b.status === 'COMPLETED' && b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + b.price, 0);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] text-[#1F2937] shadow-xs">
      <div className="px-4 md:px-6 py-3 flex items-center gap-3">
        {/* Salon info (mobile shows here, desktop shows in sidebar) */}
        <div className="md:hidden flex items-center gap-2 min-w-0">
          <SafeImage
            src={salon.logo}
            alt={salon.name}
            className="w-8 h-8 object-cover shrink-0"
            fallbackClassName="w-8 h-8 shrink-0 flex items-center justify-center bg-[#E6F4F1] text-[#087F68]"
            rounded="lg"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate text-[#1F2937]">{salon.name}</p>
            <p className="text-xs text-[#6B7280] leading-tight truncate">{salon.area}, {salon.city}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="hidden md:flex relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            placeholder="Search bookings, customers, services, staff..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#1F2937] placeholder:text-[#6B7280] focus:border-[#087F68] focus:bg-white outline-none transition-colors"
          />
          {searchOpen && query.trim() && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg max-h-96 overflow-y-auto scroll-area-custom z-50 text-[#1F2937]">
              {searchResults.bookings.length === 0 && searchResults.customers.length === 0 &&
               searchResults.services.length === 0 && searchResults.staff.length === 0 ? (
                <div className="p-4 text-sm text-[#6B7280] text-center">No results for &quot;{query}&quot;</div>
              ) : (
                <div className="p-2 space-y-1">
                  {searchResults.bookings.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-[#087F68] px-2 pt-1 uppercase tracking-wider">Bookings</p>
                      {searchResults.bookings.map(b => (
                        <button key={b.id} onClick={() => openResult('booking', b.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F3F4F6] text-left transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-[#1F2937]">{b.customerName} — {b.serviceName}</p>
                            <p className="text-xs text-[#6B7280] truncate">{b.id} · {b.date} {b.startTime}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.customers.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-[#087F68] px-2 pt-1 uppercase tracking-wider">Customers</p>
                      {searchResults.customers.map(c => (
                        <button key={c.id} onClick={() => openResult('customer', c.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F3F4F6] text-left transition-colors">
                          <Avatar src={c.image} alt={c.name} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-[#1F2937]">{c.name}</p>
                            <p className="text-xs text-[#6B7280] truncate">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.services.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-[#087F68] px-2 pt-1 uppercase tracking-wider">Services</p>
                      {searchResults.services.map(s => (
                        <button key={s.id} onClick={() => openResult('service', s.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F3F4F6] text-left transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-[#1F2937]">{s.name}</p>
                            <p className="text-xs text-[#6B7280] truncate">{s.category} · {formatCurrency(s.price)}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.staff.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-[#087F68] px-2 pt-1 uppercase tracking-wider">Staff</p>
                      {searchResults.staff.map(s => (
                        <button key={s.id} onClick={() => openResult('staff', s.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F3F4F6] text-left transition-colors">
                          <Avatar src={s.photo} alt={s.name} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-[#1F2937]">{s.name}</p>
                            <p className="text-xs text-[#6B7280] truncate">{s.role}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's revenue quick stat - desktop only */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-sm">
          <span className="text-[#6B7280] text-xs font-medium">Today</span>
          <span className="font-semibold text-[#1F2937]">{formatCurrency(todayRevenue)}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1 md:flex-none" />

        {/* Salon status toggle — Green for open, Red for closed */}
        <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-1">
          <button
            onClick={() => setSalonStatus('OPEN')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              salon.status === 'OPEN' ? 'bg-[#087F68] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#1F2937]'
            )}
          >
            Open
          </button>
          <button
            onClick={() => setSalonStatus('CLOSED')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              salon.status === 'CLOSED' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#1F2937]'
            )}
          >
            Closed
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={() => setView('notifications')}
          className="relative p-2.5 rounded-xl hover:bg-[#F9FAFB] text-[#1F2937] transition-colors border border-transparent hover:border-[#E5E7EB]"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-[#1F2937]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#DC2626] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-[#F9FAFB] transition-colors border border-transparent hover:border-[#E5E7EB]">
              <Avatar src={salon.logo} alt={salon.name} size={32} />
              <ChevronDown className="w-4 h-4 text-[#6B7280] hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border-[#E5E7EB] text-[#1F2937] shadow-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#1F2937]">{salon.name}</span>
                <span className="text-xs text-[#6B7280]">{currentRole.replace('SALON_', '').toLowerCase()} account</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E5E7EB]" />
            <DropdownMenuLabel className="text-xs text-[#6B7280]">Switch role (demo)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setRole('SALON_OWNER')} className="hover:bg-[#F3F4F6] focus:bg-[#F3F4F6]">
              <span className={cn('w-1.5 h-1.5 rounded-full', currentRole === 'SALON_OWNER' ? 'bg-[#087F68]' : 'bg-transparent')} />
              Salon Owner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRole('SALON_MANAGER')} className="hover:bg-[#F3F4F6] focus:bg-[#F3F4F6]">
              <span className={cn('w-1.5 h-1.5 rounded-full', currentRole === 'SALON_MANAGER' ? 'bg-[#087F68]' : 'bg-transparent')} />
              Salon Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRole('SALON_STAFF')} className="hover:bg-[#F3F4F6] focus:bg-[#F3F4F6]">
              <span className={cn('w-1.5 h-1.5 rounded-full', currentRole === 'SALON_STAFF' ? 'bg-[#087F68]' : 'bg-transparent')} />
              Salon Staff
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E5E7EB]" />
            <DropdownMenuItem onClick={() => setView('profile')} className="hover:bg-[#F3F4F6] focus:bg-[#F3F4F6]">
              <Store className="w-4 h-4 mr-2" /> Salon Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView('settings')} className="hover:bg-[#F3F4F6] focus:bg-[#F3F4F6]">
              <Menu className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={resetData} className="hover:bg-[#F3F4F6] focus:bg-[#F3F4F6]">
              <span className="text-[#DC2626]">Reset demo data</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
