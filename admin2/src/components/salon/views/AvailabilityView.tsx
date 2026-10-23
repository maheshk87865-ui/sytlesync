'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState } from '../ui';
import { StatusBadge, formatTime, todayStr, getDayKey } from '../shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, Plus, Ban, Coffee, Trash2, Clock, Store,
  Calendar as CalIcon, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SLOT_INTERVAL = 30;

const blockReasons = ['Staff meeting', 'Personal break', 'Maintenance', 'Private event', 'Salon closed', 'Other'];
const breakLabels = ['Lunch Break', 'Staff Break', 'Tea Break', 'Cleaning Break'];

export function AvailabilityView() {
  const salon = useSalonStore(s => s.salon);
  const staff = useSalonStore(s => s.staff);
  const bookings = useSalonStore(s => s.bookings);
  const blockedSlots = useSalonStore(s => s.blockedSlots);
  const blockSlot = useSalonStore(s => s.blockSlot);
  const addBreak = useSalonStore(s => s.addBreak);
  const unblockSlot = useSalonStore(s => s.unblockSlot);
  const removeBreak = useSalonStore(s => s.removeBreak);
  const setSalonStatus = useSalonStore(s => s.setSalonStatus);
  const setTemporaryClosure = useSalonStore(s => s.setTemporaryClosure);
  const clearTemporaryClosure = useSalonStore(s => s.clearTemporaryClosure);
  const updateSalon = useSalonStore(s => s.updateSalon);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setView = useSalonStore(s => s.setView);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [blockOpen, setBlockOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);

  // Compute slots for the date
  const slots = useMemo(() => {
    const dayKey = getDayKey(selectedDate);
    const salonHours = salon.openingHours[dayKey as keyof typeof salon.openingHours];
    if (salonHours.closed) return [];
    const [oh, om] = salonHours.open.split(':').map(Number);
    const [ch, cm] = salonHours.close.split(':').map(Number);
    const start = oh * 60 + om;
    const end = ch * 60 + cm;
    const list: { start: string; end: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BREAK'; booking?: any; reason?: string; blockedId?: string }[] = [];
    for (let t = start; t + SLOT_INTERVAL <= end; t += SLOT_INTERVAL) {
      const sTime = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const eTime = `${String(Math.floor((t + SLOT_INTERVAL) / 60)).padStart(2, '0')}:${String((t + SLOT_INTERVAL) % 60).padStart(2, '0')}`;

      // Check blocked/break
      const blocked = blockedSlots.find(blk =>
        blk.date === selectedDate && sTime < blk.endTime && eTime > blk.startTime
      );
      if (blocked) {
        list.push({ start: sTime, end: eTime, status: blocked.type === 'BREAK' ? 'BREAK' : 'BLOCKED', reason: blocked.reason, blockedId: blocked.id });
        continue;
      }

      // Check bookings (any staff)
      const booking = bookings.find(b =>
        b.date === selectedDate &&
        b.status !== 'CANCELLED' &&
        sTime < b.endTime && eTime > b.startTime
      );
      if (booking) {
        list.push({ start: sTime, end: eTime, status: 'BOOKED', booking });
        continue;
      }

      list.push({ start: sTime, end: eTime, status: 'AVAILABLE' });
    }
    return list;
  }, [selectedDate, salon, bookings, blockedSlots]);

  const dayBookings = bookings.filter(b => b.date === selectedDate && b.status !== 'CANCELLED');
  const dayRevenue = dayBookings.filter(b => b.status === 'COMPLETED' && b.paymentStatus === 'PAID').reduce((s, b) => s + b.price, 0);

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const openBookingDetail = (id: string) => {
    selectBooking(id);
    setView('bookings');
  };

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="Manage time slots, blocks, breaks, and salon status"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBreakOpen(true)}>
              <Coffee className="w-4 h-4 mr-1.5" /> Add Break
            </Button>
            <Button size="sm" onClick={() => setBlockOpen(true)}>
              <Ban className="w-4 h-4 mr-1.5" /> Block Slot
            </Button>
          </div>
        }
      />

      {/* Salon status card */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-5 shadow-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              salon.status === 'OPEN' ? 'icon-emerald' : 'icon-red'
            )}>
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Salon is currently <span className={salon.status === 'OPEN' ? 'text-primary' : 'text-destructive'}>{salon.status === 'OPEN' ? 'Open' : 'Closed'}</span></p>
              <p className="text-xs text-muted-foreground">{salon.status === 'OPEN' ? 'Customers can book new appointments' : 'Customers cannot book new appointments'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
              <button onClick={() => setSalonStatus('OPEN')}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  salon.status === 'OPEN' ? 'bg-status-OPEN shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Open</button>
              <button onClick={() => setSalonStatus('CLOSED')}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  salon.status === 'CLOSED' ? 'bg-status-CLOSED shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Closed</button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setClosureOpen(true)}>Temporary Closure</Button>
          </div>
        </div>
        {salon.temporaryClosure && (
          <div className="mt-3 p-3 rounded-lg bg-status-cancelled/10 border border-status-cancelled/30 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-status-cancelled">Temporary closure active</p>
              <p className="text-xs">{salon.temporaryClosure.start} – {salon.temporaryClosure.end} · {salon.temporaryClosure.reason}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearTemporaryClosure}>Clear</Button>
          </div>
        )}
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
          <Button variant="outline" size="icon" onClick={() => shiftDate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayStr())}>Today</Button>
      </div>

      {/* Day stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Booked slots</p>
          <p className="text-lg font-bold">{dayBookings.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Blocked/Breaks</p>
          <p className="text-lg font-bold">{blockedSlots.filter(b => b.date === selectedDate).length}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Day Revenue</p>
          <p className="text-lg font-bold">{`₹${dayRevenue.toLocaleString('en-IN')}`}</p>
        </div>
      </div>

      {/* Slots grid */}
      {slots.length === 0 ? (
        <EmptyState icon={CalIcon} title="Salon closed on this day" subtitle="Adjust opening hours in Salon Profile to enable bookings for this day." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {slots.map((slot, idx) => (
            <SlotCard key={idx} slot={slot} date={selectedDate}
              onBlock={() => setBlockOpen(true)}
              onViewBooking={(id) => openBookingDetail(id)}
              onUnblock={(id) => unblockSlot(id)}
              onRemoveBreak={(id) => removeBreak(id)}
            />
          ))}
        </div>
      )}

      <BlockSlotDialog open={blockOpen} onOpenChange={setBlockOpen} date={selectedDate} />
      <AddBreakDialog open={breakOpen} onOpenChange={setBreakOpen} date={selectedDate} />
      <TemporaryClosureDialog open={closureOpen} onOpenChange={setClosureOpen} />
    </div>
  );
}

function SlotCard({ slot, date, onBlock, onViewBooking, onUnblock, onRemoveBreak }: {
  slot: { start: string; end: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BREAK'; booking?: any; reason?: string; blockedId?: string };
  date: string;
  onBlock: () => void;
  onViewBooking: (id: string) => void;
  onUnblock: (id: string) => void;
  onRemoveBreak: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5 text-left transition-all',
        slot.status === 'AVAILABLE' && 'bg-card border-border hover:border-primary/40 cursor-pointer',
        slot.status === 'BOOKED' && 'bg-status-booked/15 border-status-booked/40',
        slot.status === 'BLOCKED' && 'bg-status-blocked/15 border-status-blocked/40',
        slot.status === 'BREAK' && 'bg-status-break/15 border-status-break/40'
      )}
      onClick={() => {
        if (slot.status === 'AVAILABLE') onBlock();
        else if (slot.status === 'BOOKED' && slot.booking) onViewBooking(slot.booking.id);
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold">{formatTime(slot.start)}</p>
        <StatusBadge status={slot.status} className="text-[9px] px-1.5 py-0.5" />
      </div>
      <p className="text-[10px] text-muted-foreground">{formatTime(slot.end)}</p>
      {slot.status === 'BOOKED' && slot.booking && (
        <p className="text-xs font-medium truncate mt-1">{slot.booking.customerName}</p>
      )}
      {slot.status === 'BLOCKED' && slot.reason && (
        <p className="text-xs truncate mt-1">{slot.reason}</p>
      )}
      {slot.status === 'BREAK' && slot.reason && (
        <p className="text-xs truncate mt-1">{slot.reason}</p>
      )}
      {(slot.status === 'BLOCKED' || slot.status === 'BREAK') && slot.blockedId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (slot.status === 'BREAK' && slot.blockedId) {
              onRemoveBreak(slot.blockedId);
            } else if (slot.blockedId) {
              onUnblock(slot.blockedId);
            }
          }}
          className="mt-1 text-[10px] text-status-cancelled hover:underline inline-flex items-center gap-0.5"
        >
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      )}
    </div>
  );
}

function BlockSlotDialog({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const salon = useSalonStore(s => s.salon);
  const blockSlot = useSalonStore(s => s.blockSlot);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState(blockReasons[0]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  const dayKey = getDayKey(date);
  const salonHours = salon.openingHours[dayKey as keyof typeof salon.openingHours];

  const handleSubmit = () => {
    setError('');
    if (!startTime || !endTime) { setError('Please select start and end time'); return; }
    if (startTime >= endTime) { setError('End time must be after start time'); return; }
    const r = reason === 'Other' ? customReason : reason;
    if (!r.trim()) { setError('Please provide a reason'); return; }
    const result = blockSlot(date, startTime, endTime, r);
    if (!result.success) { setError(result.message); return; }
    onOpenChange(false);
    setStartTime(''); setEndTime(''); setCustomReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Block Time Slot</DialogTitle>
          <DialogDescription>{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-cancelled/15 border border-status-cancelled/30">
              <AlertCircle className="w-4 h-4 text-status-cancelled shrink-0 mt-0.5" />
              <p className="text-sm text-status-cancelled">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                min={salonHours.open} max={salonHours.close} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                min={salonHours.open} max={salonHours.close} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {blockReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {reason === 'Other' && (
              <Input placeholder="Specify reason" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
            )}
          </div>
          <p className="text-xs text-muted-foreground">Customers will not be able to book this time slot.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Block Slot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddBreakDialog({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const salon = useSalonStore(s => s.salon);
  const addBreak = useSalonStore(s => s.addBreak);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [label, setLabel] = useState(breakLabels[0]);
  const [error, setError] = useState('');

  const dayKey = getDayKey(date);
  const salonHours = salon.openingHours[dayKey as keyof typeof salon.openingHours];

  const handleSubmit = () => {
    setError('');
    if (!startTime || !endTime) { setError('Please select start and end time'); return; }
    if (startTime >= endTime) { setError('End time must be after start time'); return; }
    addBreak(date, startTime, endTime, label);
    onOpenChange(false);
    setStartTime(''); setEndTime('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Break</DialogTitle>
          <DialogDescription>{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-cancelled/15 border border-status-cancelled/30">
              <AlertCircle className="w-4 h-4 text-status-cancelled shrink-0 mt-0.5" />
              <p className="text-sm text-status-cancelled">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                min={salonHours.open} max={salonHours.close} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                min={salonHours.open} max={salonHours.close} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Break Type</Label>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {breakLabels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Slots during this break will be marked unavailable.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Break</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemporaryClosureDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const setTemporaryClosure = useSalonStore(s => s.setTemporaryClosure);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!start || !end || !reason) return;
    setTemporaryClosure(start, end, reason);
    onOpenChange(false);
    setStart(''); setEnd(''); setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Temporary Closure</DialogTitle>
          <DialogDescription>Set a temporary closure period for the salon.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input placeholder="e.g. Maintenance work, family emergency..." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Set Closure</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
