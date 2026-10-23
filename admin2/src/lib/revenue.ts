// StyleSync — Shared revenue calculation module
// ONE source of truth: the payments[] array.
// All revenue numbers across the app (Dashboard, Payments, Analytics, charts)
// are computed through these helpers to guarantee consistency.

import type { Payment } from './types';

export type DateRange = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'ALL';

// Convert a Date to a local yyyy-mm-dd string (avoids UTC drift)
export const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Get the {start, end} date strings (inclusive, yyyy-mm-dd) for a given range
export const getRangeBounds = (range: DateRange, todayStr: string): { start: string; end: string } => {
  const today = new Date(todayStr + 'T00:00:00');
  if (range === 'TODAY') {
    return { start: todayStr, end: todayStr };
  }
  if (range === 'WEEK') {
    // Week starts Sunday, ends Saturday (Indian business week convention)
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  if (range === 'MONTH') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  if (range === 'LAST_MONTH') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  // ALL
  return { start: '0000-01-01', end: '9999-12-31' };
};

// Get bounds for an arbitrary month (1-12) in a given year
export const getMonthBounds = (year: number, month: number): { start: string; end: string } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
};

// Get bounds for an entire year
export const getYearBounds = (year: number): { start: string; end: string } => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
};

// Check if a date string (yyyy-mm-dd) falls within a range
export const isDateInRange = (date: string, range: DateRange, today: string) => {
  const { start, end } = getRangeBounds(range, today);
  return date >= start && date <= end;
};

// Filter payments by date range (any status)
export const filterPaymentsByRange = (payments: Payment[], range: DateRange, today: string): Payment[] => {
  const { start, end } = getRangeBounds(range, today);
  return payments.filter(p => p.date >= start && p.date <= end);
};

// Filter payments by an arbitrary start/end date (used by the custom month/year picker)
export const filterPaymentsByBounds = (payments: Payment[], start: string, end: string): Payment[] => {
  return payments.filter(p => p.date >= start && p.date <= end);
};

// Revenue = sum of PAID payments in the date range.
// Pending, Failed, and Refunded payments do NOT count as collected revenue.
export const calculateRevenue = (payments: Payment[], range: DateRange, today: string): number => {
  return filterPaymentsByRange(payments, range, today)
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
};

// Revenue for an arbitrary start/end date (used by the custom month/year picker)
export const calculateRevenueByBounds = (payments: Payment[], start: string, end: string): number => {
  return filterPaymentsByBounds(payments, start, end)
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
};

// Sum of PAID payments from an already-filtered list (used for "filtered revenue")
export const sumPaid = (payments: Payment[]): number => {
  return payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
};

// All five revenue numbers, returned as an object — used by both Dashboard cards
// (if added) and the Payments view cards.
export const calculateAllRevenues = (payments: Payment[], today: string) => {
  return {
    today: calculateRevenue(payments, 'TODAY', today),
    week: calculateRevenue(payments, 'WEEK', today),
    month: calculateRevenue(payments, 'MONTH', today),
    lastMonth: calculateRevenue(payments, 'LAST_MONTH', today),
    allTime: calculateRevenue(payments, 'ALL', today),
  };
};

// Monthly breakdown of a year — returns 12 entries with month name + revenue.
// Used by the Revenue Explorer box to show the bar chart of each month.
export const getYearlyMonthlyBreakdown = (payments: Payment[], year: number) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames.map((name, idx) => {
    const { start, end } = getMonthBounds(year, idx + 1);
    const revenue = calculateRevenueByBounds(payments, start, end);
    return { month: idx + 1, name, revenue };
  });
};

// Today's date as yyyy-mm-dd (local)
export const getTodayStr = () => toLocalDateStr(new Date());

// Format a year + month number into a human-readable label
export const formatMonthLabel = (year: number, month: number): string => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[month - 1]} ${year}`;
};

