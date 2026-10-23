// Shared UI helpers - status badge, currency formatting, time formatting
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;

export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatDateShort = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const formatTimeShort = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const statusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-status-pending',
    UPCOMING: 'bg-status-upcoming',
    COMPLETED: 'bg-status-completed',
    CANCELLED: 'bg-status-cancelled',
    AVAILABLE: 'bg-status-available',
    BOOKED: 'bg-status-booked',
    BLOCKED: 'bg-status-blocked',
    BREAK: 'bg-status-break',
    PAID: 'bg-status-PAID',
    PENDING_PAYMENT: 'bg-status-PENDING',
    REFUNDED: 'bg-status-REFUNDED',
    FAILED: 'bg-status-FAILED',
    OPEN: 'bg-status-OPEN',
    CLOSED: 'bg-status-CLOSED',
    ACTIVE: 'bg-status-ACTIVE',
    INACTIVE: 'bg-status-INACTIVE',
    'IN PROGRESS': 'bg-status-IN_PROGRESS',
    RESOLVED: 'bg-status-RESOLVED',
    OPEN_TICKET: 'bg-status-pending',
  };
  return map[status] || 'bg-status-pending';
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    PENDING: 'Pending', UPCOMING: 'Upcoming', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
    AVAILABLE: 'Available', BOOKED: 'Booked', BLOCKED: 'Blocked', BREAK: 'Break',
    PAID: 'Paid', REFUNDED: 'Refunded', FAILED: 'Failed',
    OPEN: 'Open', CLOSED: 'Closed', ACTIVE: 'Active', INACTIVE: 'Inactive',
    'IN PROGRESS': 'In Progress', RESOLVED: 'Resolved',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', statusBadgeClass(status), className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {map[status] || status}
    </span>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  // Warm amber/gold accent for ratings — premium, trustworthy
  const filledColor = 'oklch(0.72 0.16 70)';   // warm gold
  const emptyColor = 'oklch(0.78 0.04 70)';     // muted warm gray
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? filledColor : 'none'}
          stroke={i <= Math.round(rating) ? filledColor : emptyColor}
          strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function Avatar({ src, alt, size = 40, className }: { src: string; alt: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = alt.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  if (failed || !src) {
    return (
      <div
        className={cn('rounded-full flex items-center justify-center bg-[#E6F4F1] text-[#087F68] font-bold shrink-0 select-none border border-[#E5E7EB]', className)}
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.35 }}>{initials}</span>
      </div>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full object-cover bg-muted shrink-0', className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * SafeImage — an <img> with a branded fallback that shows if the image fails to load.
 */
export function SafeImage({
  src, alt, className, fallbackClassName, rounded = 'lg', showTextInFallback = true,
}: {
  src: string; alt: string; className?: string; fallbackClassName?: string;
  rounded?: 'full' | '2xl' | 'xl' | 'lg' | 'md' | 'none';
  showTextInFallback?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const roundClass = rounded === 'full' ? 'rounded-full' : rounded === '2xl' ? 'rounded-2xl' : rounded === 'xl' ? 'rounded-xl' : rounded === 'lg' ? 'rounded-lg' : rounded === 'md' ? 'rounded-md' : '';
  const initials = alt.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  if (failed || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden bg-[#F9FAFB] text-[#087F68] font-semibold shrink-0 select-none border border-[#E5E7EB]',
          roundClass,
          className,
          fallbackClassName
        )}
      >
        {showTextInFallback ? (
          <span className="text-xs md:text-sm font-bold tracking-wide px-2 text-center leading-tight">
            {initials || alt}
          </span>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#087F68" strokeWidth="1.5" className="opacity-40">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export const timeToMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const generateSlots = (openTime: string, closeTime: string, intervalMin: number = 30) => {
  const slots: string[] = [];
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const start = oh * 60 + om;
  const end = ch * 60 + cm;
  for (let t = start; t + intervalMin <= end; t += intervalMin) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
};

export const getDayKey = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[d.getDay()];
};

export const getDayName = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
};

export const todayStr = () => new Date().toISOString().split('T')[0];
