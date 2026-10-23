'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User, Scissors, Calendar, Sparkles, HelpCircle, Loader2 } from 'lucide-react';

interface SearchResult {
  query: string;
  customers: Array<{ id: string; name: string; email: string; phone: string; status: string }>;
  salons: Array<{ id: string; name: string; locality: string; applicationStatus: string }>;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    appointmentDate: string;
    bookingStatus: string;
    customer: { name: string };
    salon: { name: string };
  }>;
  services: Array<{ id: string; name: string; basePrice: number; category: { name: string } }>;
  tickets: Array<{ id: string; ticketNumber: string; subject: string; status: string }>;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const hasAnyResults =
    results &&
    (results.customers.length > 0 ||
      results.salons.length > 0 ||
      results.bookings.length > 0 ||
      results.services.length > 0 ||
      results.tickets.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E2E8E6] overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#E2E8E6] bg-slate-50">
          <Search className="w-5 h-5 text-[#64706E] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, salons, bookings, services, tickets... (e.g. Chinar, BK-0001, Insha)"
            className="w-full bg-transparent text-[#17201F] placeholder-slate-400 focus:outline-hidden text-sm"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#0F766E] animate-spin mr-2" />}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-[#E2E8E6]">
          {!query && (
            <div className="text-center py-8 text-sm text-[#64706E]">
              Type a name, booking number, email, or Srinagar locality to search platform-wide.
            </div>
          )}

          {query && !loading && !hasAnyResults && (
            <div className="text-center py-8 text-sm text-[#64706E]">
              No records matched &ldquo;<span className="font-semibold text-[#17201F]">{query}</span>&rdquo; in the StyleSync database.
            </div>
          )}

          {results?.customers && results.customers.length > 0 && (
            <div className="py-3 first:pt-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64706E] mb-2 block">
                Customers ({results.customers.length})
              </span>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigateTo(`/customers/${c.id}`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#17201F]">{c.name}</div>
                        <div className="text-xs text-[#64706E]">{c.email} • {c.phone}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results?.salons && results.salons.length > 0 && (
            <div className="py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64706E] mb-2 block">
                Salons ({results.salons.length})
              </span>
              <div className="space-y-1">
                {results.salons.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigateTo(`/salons/${s.id}`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#17201F]">{s.name}</div>
                        <div className="text-xs text-[#64706E]">{s.locality}, Srinagar</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {s.applicationStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results?.bookings && results.bookings.length > 0 && (
            <div className="py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64706E] mb-2 block">
                Bookings ({results.bookings.length})
              </span>
              <div className="space-y-1">
                {results.bookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => navigateTo(`/bookings?search=${encodeURIComponent(b.bookingNumber)}`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#17201F]">
                          {b.bookingNumber} — {b.customer.name}
                        </div>
                        <div className="text-xs text-[#64706E]">
                          {b.salon.name} • {b.appointmentDate}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                      {b.bookingStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results?.services && results.services.length > 0 && (
            <div className="py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64706E] mb-2 block">
                Global Services ({results.services.length})
              </span>
              <div className="space-y-1">
                {results.services.map((serv) => (
                  <div
                    key={serv.id}
                    onClick={() => navigateTo(`/services?search=${encodeURIComponent(serv.name)}`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#17201F]">{serv.name}</div>
                        <div className="text-xs text-[#64706E]">{serv.category.name}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0F766E]">₹{serv.basePrice}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results?.tickets && results.tickets.length > 0 && (
            <div className="py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64706E] mb-2 block">
                Support Tickets ({results.tickets.length})
              </span>
              <div className="space-y-1">
                {results.tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigateTo(`/support?search=${encodeURIComponent(t.ticketNumber)}`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#17201F]">
                          {t.ticketNumber} — {t.subject}
                        </div>
                        <div className="text-xs text-[#64706E]">Status: {t.status}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
