'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { ChevronRight, Home } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

function AdminShellInner({
  children,
  breadcrumbs,
  title,
  description,
  actions,
}: AdminShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center gap-3" suppressHydrationWarning>
        <div className="w-12 h-12 rounded-xl bg-[#0F766E] flex items-center justify-center text-white text-xl font-bold shadow-md">
          S
        </div>
        <div className="flex items-center gap-2 text-sm text-[#0F766E] font-medium" suppressHydrationWarning>
          <LoadingSpinner size="sm" />
          Verifying StyleSync administrative session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0">
        <AdminSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-xs flex">
          <div className="w-64 bg-white h-full shadow-2xl relative flex flex-col">
            <AdminSidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileOpen(false)}
            />
          </div>
          <div className="flex-1" onClick={() => setIsMobileOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <AdminHeader onMobileMenuToggle={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-[#64706E] mb-3">
              <Link
                href="/dashboard"
                className="hover:text-[#0F766E] transition-colors flex items-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  {b.href ? (
                    <Link href={b.href} className="hover:text-[#0F766E] transition-colors">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[#17201F]">{b.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Page Title & Action Bar */}
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold tracking-tight text-[#17201F]">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-sm text-[#64706E] mt-1">{description}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center gap-3" suppressHydrationWarning>
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] flex items-center justify-center text-white text-xl font-bold shadow-md">
            S
          </div>
          <div className="flex items-center gap-2 text-sm text-[#0F766E] font-medium" suppressHydrationWarning>
            <LoadingSpinner size="sm" />
            Loading StyleSync Admin Console...
          </div>
        </div>
      }
    >
      <AdminShellInner {...props} />
    </Suspense>
  );
}
