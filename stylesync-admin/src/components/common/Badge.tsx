import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'mint';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'neutral', size = 'md' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    mint: 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium transition-colors ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const upper = (status || '').toUpperCase();

  if (['APPROVED', 'CONFIRMED', 'COMPLETED', 'PAID', 'SUCCESS', 'ACTIVE', 'OPEN', 'VERIFIED', 'RESOLVED'].includes(upper)) {
    return <Badge variant="success">{upper}</Badge>;
  }
  if (['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'UNVERIFIED'].includes(upper)) {
    return <Badge variant="warning">{upper}</Badge>;
  }
  if (['REJECTED', 'CANCELLED', 'FAILED', 'SUSPENDED', 'URGENT', 'REPORTED'].includes(upper)) {
    return <Badge variant="danger">{upper}</Badge>;
  }
  if (['CLOSED', 'NO_SHOW', 'INACTIVE'].includes(upper)) {
    return <Badge variant="neutral">{upper}</Badge>;
  }

  return <Badge variant="mint">{upper}</Badge>;
}
