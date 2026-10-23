'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  href?: string;
  badge?: string;
  colorScheme?: 'teal' | 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  badge,
  colorScheme = 'teal',
}: MetricCardProps) {
  const schemeStyles = {
    teal: 'bg-[#CCFBF1] text-[#0F766E]',
    emerald: 'bg-emerald-100 text-emerald-800',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    slate: 'bg-slate-100 text-slate-800',
  };

  const CardContent = (
    <div className="bg-white rounded-xl p-5 border border-[#E2E8E6] shadow-xs hover:shadow-md transition-all duration-200 group relative">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-[#64706E]">{title}</span>
        <div className={`p-2.5 rounded-lg ${schemeStyles[colorScheme]} transition-transform group-hover:scale-105`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#17201F]">{value}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-[#CCFBF1] text-[#0F766E] font-medium border border-[#99F6E4]">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        {subtitle && <span className="text-[#64706E]">{subtitle}</span>}
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] rounded-xl">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
