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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Avatar, StatusBadge, formatCurrency, formatDate, formatTime, todayStr, getDayKey } from '../shared';
import {
  Phone, Mail, Calendar as CalIcon, Clock, User, Check, X, CalendarClock,
  MessageSquare, History, AlertCircle
} from 'lucide-react';

export function BookingDetailsDialog({ bookingId, open, onOpenChange }: { bookingId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const bookings = useSalonStore(s => s.bookings);
  const customers = useSalonStore(s => s.customers);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const updateBookingStatus = useSalonStore(s => s.updateBookingStatus);
  const rescheduleBooking = useSalonStore(s => s.rescheduleBooking);
  const selectCustomer = useSalonStore(s => s.selectCustomer);
  const setView = useSalonStore(s => s.setView);
  const getSlotsForDateStaff = useSalonStore(s => s.getSlotsForDateStaff);
  const pushToast = useSalonStore(s => s.pushToast);

  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const booking = bookings.find(b => b.id === bookingId);

  const customer = customers.find(c => c.id === booking?.customerId);
  const customerBookings = useMemo(() =>
    booking ? bookings.filter(b => b.customerId === booking.customerId).sort((a, b) => b.date.localeCompare(a.date)) : [],
    [bookings, booking]);

  // Available slots for reschedule
  const rescheduleSlots = useMemo(() => {
    if (!newDate || !booking) return [];
    return getSlotsForDateStaff(newDate, booking.staffId)
      .filter(s => s.status === 'AVAILABLE')
      .map(s => s.time);
  }, [newDate, booking, getSlotsForDateStaff]);

  if (!booking) return null;
  const canAccept = booking.status === 'PENDING';
  const canComplete = booking.status === 'PENDING' || booking.status === 'UPCOMING';
  const canCancel = booking.status === 'PENDING' || booking.status === 'UPCOMING';
  const canReschedule = booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';

  const handleReschedule = () => {
    if (!newDate || !newTime) {
      pushToast('Please select a new date and time', 'error');
      return;
    }
    const result = rescheduleBooking(booking.id, newDate, newTime);
    if (result.success) {
      setShowReschedule(false);
      setNewDate(''); setNewTime('');
    } else {
      pushToast(result.message, 'error');
    }
  };

  const handleCancel = () => {
    updateBookingStatus(booking.id, 'CANCELLED', cancelReason || 'Cancelled by salon');
    setShowCancel(false);
    setCancelReason('');
    onOpenChange(false);
  };

  const handleContact = () => {
    window.location.href = `tel:${booking.customerPhone}`;
  };

  const handleViewCustomer = () => {
    onOpenChange(false);
    if (booking.customerId) {
      selectCustomer(booking.customerId);
      setView('customers');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg">Booking Details</DialogTitle>
                <DialogDescription className="font-mono text-xs">{booking.id}</DialogDescription>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Customer info */}
            <div className="rounded-2xl bg-muted/30 p-4 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={customer?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.customerName)}&background=B76E79&color=fff`} alt={booking.customerName} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{booking.customerName}</p>
                  <p className="text-xs text-muted-foreground">{customer ? `${customer.totalBookings} total bookings · ${formatCurrency(customer.totalSpent)} spent` : 'New customer'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{booking.customerEmail || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Appointment info */}
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Service" value={booking.serviceName} sub={booking.category} />
              <DetailItem label="Staff" value={booking.staffName} sub={staff.find(s => s.id === booking.staffId)?.role} />
              <DetailItem label="Date" value={formatDate(booking.date)} />
              <DetailItem label="Time" value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`} sub={`${booking.duration} min`} />
              <DetailItem label="Price" value={formatCurrency(booking.price)} />
              <DetailItem label="Payment" value={booking.paymentStatus} />
            </div>

            {booking.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">{booking.notes}</p>
              </div>
            )}

            {booking.status === 'CANCELLED' && booking.cancellationReason && (
              <div className="rounded-lg bg-status-cancelled/10 border border-status-cancelled/30 p-3">
                <p className="text-xs text-status-cancelled font-semibold mb-1">Cancellation Reason</p>
                <p className="text-sm">{booking.cancellationReason}</p>
                {booking.cancelledAt && <p className="text-xs text-muted-foreground mt-1">Cancelled on {formatDate(booking.cancelledAt.split('T')[0])}</p>}
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{formatDate(booking.createdAt.split('T')[0])}</p>
            </div>

            {/* Booking history for this customer */}
            {customerBookings.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Customer Booking History</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scroll-area-custom">
                  {customerBookings.slice(0, 8).map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground w-20">{formatDate(b.date)}</span>
                      <span className="flex-1 truncate">{b.serviceName}</span>
                      <span className="text-muted-foreground">{formatCurrency(b.price)}</span>
                      <StatusBadge status={b.status} className="text-[10px] px-1.5 py-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reschedule form */}
            {showReschedule && (
              <div className="rounded-2xl border border-border p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-semibold">Reschedule Booking</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">New Date</Label>
                    <Input type="date" min={todayStr()} value={newDate} onChange={(e) => { setNewDate(e.target.value); setNewTime(''); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">New Time</Label>
                    {newDate && rescheduleSlots.length === 0 ? (
                      <p className="text-xs text-status-cancelled pt-2">No available slots for {booking.staffName} on this date.</p>
                    ) : (
                      <Select value={newTime} onValueChange={setNewTime} disabled={!newDate}>
                        <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                        <SelectContent>
                          {rescheduleSlots.map(t => (
                            <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setShowReschedule(false); setNewDate(''); setNewTime(''); }}>Cancel</Button>
                  <Button size="sm" onClick={handleReschedule}>Confirm Reschedule</Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleContact}>
              <Phone className="w-4 h-4 mr-1.5" /> Contact
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewCustomer}>
              <User className="w-4 h-4 mr-1.5" /> View History
            </Button>
            {canReschedule && (
              <Button variant="outline" size="sm" onClick={() => setShowReschedule(s => !s)}>
                <CalendarClock className="w-4 h-4 mr-1.5" /> Reschedule
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" onClick={() => setShowCancel(true)} className="text-status-cancelled">
                <X className="w-4 h-4 mr-1.5" /> Cancel Booking
              </Button>
            )}
            {canAccept && (
              <Button size="sm" onClick={() => updateBookingStatus(booking.id, 'UPCOMING')}>
                <Check className="w-4 h-4 mr-1.5" /> Accept
              </Button>
            )}
            {canComplete && (
              <Button size="sm" onClick={() => updateBookingStatus(booking.id, 'COMPLETED')}>
                <Check className="w-4 h-4 mr-1.5" /> Mark Completed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The slot will become available again. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Cancellation reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-status-cancelled text-white hover:bg-status-cancelled/90">Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
