'use client';
import { useState } from 'react';
import { useSalonStore } from '@/lib/store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { StatusBadge, formatCurrency, formatDate, formatTime } from '../shared';
import {
  Check, RotateCcw, AlertCircle, Phone, Mail, CreditCard, Calendar as CalIcon, Clock,
  User, Scissors, Hash, FileText
} from 'lucide-react';
import type { Payment, PaymentStatus } from '@/lib/types';

export function PaymentDetailsDialog({ paymentId, open, onOpenChange }: {
  paymentId: string | null; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const payments = useSalonStore(s => s.payments);
  const bookings = useSalonStore(s => s.bookings);
  const updatePaymentStatus = useSalonStore(s => s.updatePaymentStatus);
  const updatePaymentMethod = useSalonStore(s => s.updatePaymentMethod);
  const refundPayment = useSalonStore(s => s.refundPayment);
  const setView = useSalonStore(s => s.setView);
  const selectBooking = useSalonStore(s => s.selectBooking);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const payment = payments.find(p => p.id === paymentId);
  const booking = payment ? bookings.find(b => b.id === payment.bookingId) : undefined;

  if (!payment) return null;

  const canMarkPaid = payment.status === 'PENDING' || payment.status === 'FAILED';
  const canRefund = payment.status === 'PAID';

  const handleViewBooking = () => {
    onOpenChange(false);
    if (payment) {
      selectBooking(payment.bookingId);
      setView('bookings');
    }
  };

  const handleRefund = () => {
    if (!payment) return;
    if (!refundReason.trim()) return;
    refundPayment(payment.id, refundReason.trim());
    setRefundOpen(false);
    setRefundReason('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg">Payment Details</DialogTitle>
                <DialogDescription className="font-mono text-xs">{payment.id}</DialogDescription>
              </div>
              <StatusBadge status={payment.status} />
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Amount + status hero */}
            <div className="rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-card">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Collected amount</p>
              <p className="text-3xl font-bold mt-1 text-[#1F2937]">{formatCurrency(payment.amount)}</p>
              <div className="mt-2.5 flex items-center gap-3 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#1F2937] font-medium border border-[#E5E7EB]">{payment.method}</span>
                {payment.transactionId && (
                  <span className="font-mono text-[#6B7280]">Txn: {payment.transactionId}</span>
                )}
              </div>
            </div>

            {/* Linked info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailItem icon={User} label="Customer" value={payment.customerName} />
              <DetailItem icon={Scissors} label="Service" value={payment.serviceName} />
              {payment.staffName && <DetailItem icon={User} label="Staff" value={payment.staffName} />}
              <DetailItem icon={CalIcon} label="Date" value={formatDate(payment.date)} />
              {booking && <DetailItem icon={Clock} label="Time" value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`} />}
              <DetailItem icon={CreditCard} label="Method" value={payment.method} />
              {payment.transactionId && <DetailItem icon={Hash} label="Transaction ID" value={payment.transactionId} mono />}
              {payment.createdAt && <DetailItem icon={CalIcon} label="Created" value={formatDate(payment.createdAt.split('T')[0])} />}
            </div>

            {/* Booking link */}
            <div className="rounded-xl border border-border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Linked Booking</p>
                  <p className="text-sm font-mono font-semibold">{payment.bookingId}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleViewBooking}>View Booking</Button>
              </div>
            </div>

            {/* Refund info */}
            {payment.status === 'REFUNDED' && (
              <div className="rounded-xl bg-status-blocked/15 border border-status-blocked/30 p-3">
                <p className="text-xs font-semibold text-status-blocked mb-1.5 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Refund Processed
                </p>
                <div className="space-y-1 text-sm">
                  <p>Refunded: <span className="font-semibold">{formatCurrency(payment.refundAmount || payment.amount)}</span></p>
                  {payment.refundDate && <p className="text-xs text-muted-foreground">Date: {new Date(payment.refundDate).toLocaleString('en-IN')}</p>}
                  {payment.refundReason && <p className="text-xs text-muted-foreground">Reason: {payment.refundReason}</p>}
                </div>
              </div>
            )}

            {/* Update method */}
            {payment.status !== 'REFUNDED' && (
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select
                  value={payment.method}
                  onValueChange={(v: any) => updatePaymentMethod(payment.id, v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {canMarkPaid && (
              <Button onClick={() => updatePaymentStatus(payment.id, 'PAID')}>
                <Check className="w-4 h-4 mr-1.5" /> Mark as Paid
              </Button>
            )}
            {canRefund && (
              <Button variant="outline" onClick={() => setRefundOpen(true)} className="text-status-blocked border-status-blocked/40 hover:bg-status-blocked/10">
                <RotateCcw className="w-4 h-4 mr-1.5" /> Refund Payment
              </Button>
            )}
            {payment.status === 'PENDING' && (
              <Button variant="outline" onClick={() => updatePaymentStatus(payment.id, 'FAILED')}>
                <AlertCircle className="w-4 h-4 mr-1.5" /> Mark as Failed
              </Button>
            )}
            {payment.status === 'FAILED' && (
              <Button variant="outline" onClick={() => updatePaymentStatus(payment.id, 'PENDING')}>
                Revert to Pending
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The collected revenue will decrease by {formatCurrency(payment.amount)}. The payment record will be preserved as REFUNDED for audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs">Refund reason</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Customer cancelled, service unavailable..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={!refundReason.trim()}
              className="bg-status-blocked text-white hover:bg-status-blocked/80"
            >
              Process Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailItem({ icon: Icon, label, value, mono }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
