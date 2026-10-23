'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Sparkles,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Star,
  BarChart3,
  HelpCircle,
  Bell,
  Cpu,
  MapPin,
  Settings,
  ShieldAlert,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badgeKey?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Core Operations',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Salons', href: '/salons', icon: Building2 },
      { name: 'Global Services', href: '/services', icon: Sparkles },
      { name: 'Bookings', href: '/bookings', icon: CalendarCheck },
      { name: 'Calendar & Slots', href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Finance & Community',
    items: [
      { name: 'Payments & Finance', href: '/payments', icon: CreditCard },
      { name: 'Reviews & Moderation', href: '/reviews', icon: Star },
      { name: 'Support & Disputes', href: '/support', icon: HelpCircle },
      { name: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'Intelligence & Expansion',
    items: [
      { name: 'Analytics & Reports', href: '/analytics', icon: BarChart3 },
      { name: 'AI Operations', href: '/ai-operations', icon: Cpu },
      { name: 'Locations & Pilot', href: '/locations', icon: MapPin },
    ],
  },
  {
    title: 'Platform Administration',
    items: [
      { name: 'Admin Users', href: '/admin-users', icon: Shield, roles: ['SUPER_ADMIN'] },
      { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert },
      { name: 'Platform Settings', href: '/settings', icon: Settings },
      { name: 'Admin Profile', href: '/profile', icon: UserCheck },
    ],
  },
];

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-[#E2E8E6] flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8E6] bg-slate-50/50">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
            S
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-[#17201F] truncate">
                StyleSync
              </span>
              <span className="text-[10px] font-semibold text-[#0F766E] uppercase tracking-wider">
                Super Admin
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, idx) => {
          // Filter items based on user role
          const visibleItems = section.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role))
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64706E]">
                  {section.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative ${
                      isActive
                        ? 'bg-[#CCFBF1] text-[#0F766E] font-semibold'
                        : 'text-[#64706E] hover:text-[#17201F] hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-[#0F766E]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-[#0F766E]" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Territory Indicator */}
      <div className="p-3 border-t border-[#E2E8E6] bg-slate-50/50">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-[#CCFBF1]/40 border border-[#99F6E4]/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-[#17201F]">Srinagar Pilot</span>
            </div>
            <span className="text-[10px] text-[#0F766E] font-bold">INR ₹</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Srinagar Pilot (Live)">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}
