import React from 'react';

export function LoadingSpinner({
  size = 'sm',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      suppressHydrationWarning
      className={`${sizeClasses[size]} border-[#0F766E] border-t-transparent rounded-full animate-spin shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
