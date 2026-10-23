// Reusable components used across views
'use client';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { useSalonStore } from '@/lib/store';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, trend, onClick, className, variant = 'emerald' }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  className?: string;
  variant?: 'blue' | 'lavender' | 'emerald' | 'amber' | 'green' | 'red' | 'sky' | 'purple' | 'neutral' | 'rose' | 'teal';
}) {
  const iconClass = `icon-${variant}`;
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-4 md:p-5 rounded-2xl bg-white border border-[#E5E7EB] transition-all shadow-card',
        onClick && 'hover:border-[#087F68]/40 hover:shadow-hover cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs', iconClass)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            trend === 'up' && 'bg-[#ECFDF5] text-[#047857]',
            trend === 'down' && 'bg-[#FEF2F2] text-[#B91C1C]',
            trend === 'neutral' && 'bg-[#F3F4F6] text-[#4B5563]'
          )}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
          </span>
        )}
      </div>
      {/* Large readable metric value in dark charcoal */}
      <p className="text-2xl md:text-[26px] font-bold tracking-tight leading-tight text-[#1F2937]">{value}</p>
      {/* Label in secondary gray */}
      <p className="text-sm text-[#6B7280] mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-[#6B7280]/80 mt-1">{sub}</p>}
    </button>
  );
}

// Use this hook to get fresh data on each render
export function useReset() {
  return useSalonStore(s => s.resetData);
}
