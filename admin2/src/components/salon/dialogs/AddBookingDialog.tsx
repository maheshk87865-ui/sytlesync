'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { formatCurrency, formatTime, todayStr, getDayKey } from '../shared';
import { Calendar as CalIcon, Clock, AlertCircle } from 'lucide-react';

interface AddBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultStaffId?: string;
}

export function AddBookingDialog({ open, onOpenChange, defaultDate, defaultTime, defaultStaffId }: AddBookingDialogProps) {
  if (!open) return null;
  return <AddBookingForm key={`${defaultDate || ''}-${defaultTime || ''}-${defaultStaffId || ''}`} open={open} onOpenChange={onOpenChange} defaultDate={defaultDate} defaultTime={defaultTime} defaultStaffId={defaultStaffId} />;
}

function AddBookingForm({ open, onOpenChange, defaultDate, defaultTime, defaultStaffId }: Required<Omit<AddBookingDialogProps, 'defaultDate' | 'defaultTime' | 'defaultStaffId'>> & AddBookingDialogProps) {
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const customers = useSalonStore(s => s.customers);
  const salon = useSalonStore(s => s.salon);
  const createBooking = useSalonStore(s => s.createBooking);
  const getSlotsForDateStaff = useSalonStore(s => s.getSlotsForDateStaff);
  const setView = useSalonStore(s => s.setView);
  const selectBooking = useSalonStore(s => s.selectBooking);

  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState(defaultStaffId || '');
  const [date, setDate] = useState(defaultDate || todayStr());
  const [startTime, setStartTime] = useState(defaultTime || '');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [error, setError] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const activeServices = services.filter(s => s.active);

  const selectedService = services.find(s => s.id === serviceId);
  const selectedStaff = staff.find(s => s.id === staffId);

  // When service changes, filter staff to those assigned
  const availableStaff = useMemo(() => {
    if (!selectedService) return [];
    return staff.filter(s => selectedService.assignedStaff.includes(s.id) && s.status === 'ACTIVE');
  }, [selectedService, staff]);

  // Auto-select staff when only one is available
  const effectiveStaffId = staffId && availableStaff.find(s => s.id === staffId) ? staffId
    : availableStaff.length === 1 ? availableStaff[0].id
    : '';

  // Compute available start times based on selected staff and date
  const availableStartTimes = useMemo(() => {
    if (!effectiveStaffId || !date) return [];
    const slots = getSlotsForDateStaff(date, effectiveStaffId);
    return slots.filter(s => s.status === 'AVAILABLE').map(s => s.time);
  }, [effectiveStaffId, date, getSlotsForDateStaff]);

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    setStaffId('');
    setStartTime('');
  };

  const handleStaffChange = (id: string) => {
    setStaffId(id);
    setStartTime('');
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setStartTime('');
  };

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    if (id === 'new') {
      setShowNewCustomer(true);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
    } else {
      setShowNewCustomer(false);
      const c = customers.find(c => c.id === id);
      if (c) {
        setCustomerName(c.name);
        setCustomerPhone(c.phone);
        setCustomerEmail(c.email);
      }
    }
  };

  const handleSubmit = () => {
    setError('');
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Customer name and phone are required');
      return;
    }
    if (!serviceId) { setError('Please select a service'); return; }
    if (!effectiveStaffId) { setError('Please select a staff member'); return; }
    if (!date) { setError('Please select a date'); return; }
    if (!startTime) { setError('Please select a time slot'); return; }

    const result = createBooking({
      customerId: customerId && customerId !== 'new' ? customerId : undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      serviceId,
      staffId: effectiveStaffId,
      date,
      startTime,
      notes,
      paymentStatus,
    });
    if (!result.success) {
      setError(result.message);
      return;
    }
    onOpenChange(false);
    if (result.bookingId) {
      selectBooking(result.bookingId);
      setView('bookings');
    }
  };

  const today = todayStr();
  const dayKey = getDayKey(date);
  const salonHours = salon.openingHours[dayKey as keyof typeof salon.openingHours];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Booking</DialogTitle>
          <DialogDescription>Create a manual booking for a customer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-cancelled/15 border border-status-cancelled/30">
              <AlertCircle className="w-4 h-4 text-status-cancelled shrink-0 mt-0.5" />
              <p className="text-sm text-status-cancelled">{error}</p>
            </div>
          )}

          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger><SelectValue placeholder="Select existing customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ New customer</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showNewCustomer && (
              <div className="space-y-2 pt-2">
                <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                <Input placeholder="Email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
            )}
            {!showNewCustomer && customerId && customerId !== 'new' && (
              <div className="text-xs text-muted-foreground">Phone: {customerPhone} · Email: {customerEmail || 'N/A'}</div>
            )}
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {activeServices.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {formatCurrency(s.price)} · {s.duration}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-semibold">{formatCurrency(selectedService.price)}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-semibold">{selectedService.duration} min</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-semibold">{selectedService.category}</p>
                </div>
              </div>
            )}
          </div>

          {/* Staff */}
          <div className="space-y-2">
            <Label>Staff Member</Label>
            <Select value={effectiveStaffId} onValueChange={handleStaffChange} disabled={!selectedService}>
              <SelectTrigger><SelectValue placeholder={selectedService ? 'Select staff' : 'Select service first'} /></SelectTrigger>
              <SelectContent>
                {availableStaff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>
                ))}
                {availableStaff.length === 0 && (
                  <SelectItem value="_none" disabled>No available staff for this service</SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedService && availableStaff.length === 0 && (
              <p className="text-xs text-status-cancelled">No staff assigned to this service.</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" min={today} value={date} onChange={(e) => handleDateChange(e.target.value)} />
            {salonHours?.closed && (
              <p className="text-xs text-status-cancelled">Salon is closed on this day</p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Time Slot</Label>
            {!effectiveStaffId ? (
              <p className="text-xs text-muted-foreground">Select staff and date first</p>
            ) : availableStartTimes.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>No available slots for {selectedStaff?.name} on this date.</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto scroll-area-custom">
                {availableStartTimes.map(t => (
                  <button
                    key={t}
                    onClick={() => setStartTime(t)}
                    className={`text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors ${
                      startTime === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    {formatTime(t)}
                  </button>
                ))}
              </div>
            )}
            {startTime && selectedService && (
              <p className="text-xs text-muted-foreground">
                {formatTime(startTime)} – {formatTime(addMinsToStr(startTime, selectedService.duration))}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} placeholder="Any special requests..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Payment status */}
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function addMinsToStr(t: string, mins: number) {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
