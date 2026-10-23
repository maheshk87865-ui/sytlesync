'use client';
import { useState } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader } from '../ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  User, Bell, Calendar, X, Wallet, Shield, Users, LogOut, ChevronRight, Store, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

type Section = 'ACCOUNT' | 'BUSINESS' | 'NOTIFICATIONS' | 'BOOKING' | 'CANCELLATION' | 'PAYMENT' | 'STAFF_PERMS' | 'SECURITY' | 'LOGOUT';

const SECTIONS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'ACCOUNT', label: 'Account', icon: User },
  { key: 'BUSINESS', label: 'Business Information', icon: Store },
  { key: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
  { key: 'BOOKING', label: 'Booking Settings', icon: Calendar },
  { key: 'CANCELLATION', label: 'Cancellation', icon: X },
  { key: 'PAYMENT', label: 'Payment', icon: Wallet },
  { key: 'STAFF_PERMS', label: 'Staff Permissions', icon: Users },
  { key: 'SECURITY', label: 'Security', icon: Shield },
];

export function SettingsView() {
  const settings = useSalonStore(s => s.settings);
  const updateSettings = useSalonStore(s => s.updateSettings);
  const salon = useSalonStore(s => s.salon);
  const resetData = useSalonStore(s => s.resetData);
  const currentRole = useSalonStore(s => s.currentRole);

  const [active, setActive] = useState<Section>('ACCOUNT');
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your salon configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Sidebar nav */}
        <div className="rounded-2xl border border-border bg-card p-2 h-fit sticky top-20">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{s.label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            );
          })}
          <button onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-status-cancelled hover:bg-status-cancelled/10">
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="flex-1">Logout</span>
          </button>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-border bg-card p-5">
          {active === 'ACCOUNT' && (
            <div>
              <h3 className="font-semibold mb-4">Account</h3>
              <div className="space-y-3 max-w-md">
                <div className="space-y-1.5">
                  <Label>Owner Name</Label>
                  <Input value={settings.account.ownerName} onChange={(e) => updateSettings({ account: { ...settings.account, ownerName: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={settings.account.email} onChange={(e) => updateSettings({ account: { ...settings.account, email: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={settings.account.phone} onChange={(e) => updateSettings({ account: { ...settings.account, phone: e.target.value } })} />
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Current role</p>
                  <p className="font-semibold">{currentRole.replace('SALON_', 'Salon ').toLowerCase()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Switch role from the top-right profile menu.</p>
                </div>
              </div>
            </div>
          )}

          {active === 'BUSINESS' && (
            <div>
              <h3 className="font-semibold mb-4">Business Information</h3>
              <div className="space-y-3 max-w-md">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Salon Name</p>
                  <p className="font-semibold">{salon.name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold">{salon.area}, {salon.city}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Member since</p>
                  <p className="font-semibold">{new Date(salon.joinedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <Button variant="outline" onClick={() => useSalonStore.getState().setView('profile')}>Edit Salon Profile</Button>
              </div>
            </div>
          )}

          {active === 'NOTIFICATIONS' && (
            <div>
              <h3 className="font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-1">
                <ToggleRow label="New bookings" desc="Get notified when a new booking is made"
                  checked={settings.notifications.newBooking}
                  onChange={(v) => updateSettings({ notifications: { ...settings.notifications, newBooking: v } })} />
                <Separator />
                <ToggleRow label="Booking cancellations" desc="Get notified when a customer cancels"
                  checked={settings.notifications.bookingCancelled}
                  onChange={(v) => updateSettings({ notifications: { ...settings.notifications, bookingCancelled: v } })} />
                <Separator />
                <ToggleRow label="Upcoming appointments" desc="Reminder before appointments"
                  checked={settings.notifications.upcomingAppointment}
                  onChange={(v) => updateSettings({ notifications: { ...settings.notifications, upcomingAppointment: v } })} />
                <Separator />
                <ToggleRow label="New reviews" desc="Get notified when a customer leaves a review"
                  checked={settings.notifications.newReview}
                  onChange={(v) => updateSettings({ notifications: { ...settings.notifications, newReview: v } })} />
                <Separator />
                <ToggleRow label="Payment received" desc="Confirmations of completed payments"
                  checked={settings.notifications.paymentReceived}
                  onChange={(v) => updateSettings({ notifications: { ...settings.notifications, paymentReceived: v } })} />
              </div>
            </div>
          )}

          {active === 'BOOKING' && (
            <div>
              <h3 className="font-semibold mb-4">Booking Settings</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  <div className="space-y-1.5">
                    <Label>Allow advance bookings (days)</Label>
                    <Input type="number" min="1" value={settings.booking.allowAdvanceDays}
                      onChange={(e) => updateSettings({ booking: { ...settings.booking, allowAdvanceDays: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min cancel hours</Label>
                    <Input type="number" min="0" value={settings.booking.minCancelHours}
                      onChange={(e) => updateSettings({ booking: { ...settings.booking, minCancelHours: Number(e.target.value) } })} />
                  </div>
                </div>
                <Separator />
                <ToggleRow label="Auto-confirm bookings" desc="Skip manual approval of pending bookings"
                  checked={settings.booking.autoConfirm}
                  onChange={(v) => updateSettings({ booking: { ...settings.booking, autoConfirm: v } })} />
                <Separator />
                <ToggleRow label="Require deposit" desc="Ask customers to pay a deposit when booking"
                  checked={settings.booking.requireDeposit}
                  onChange={(v) => updateSettings({ booking: { ...settings.booking, requireDeposit: v } })} />
                {settings.booking.requireDeposit && (
                  <div className="space-y-1.5 max-w-xs">
                    <Label>Deposit percentage (%)</Label>
                    <Input type="number" min="1" max="100" value={settings.booking.depositPercent}
                      onChange={(e) => updateSettings({ booking: { ...settings.booking, depositPercent: Number(e.target.value) } })} />
                  </div>
                )}
              </div>
            </div>
          )}

          {active === 'CANCELLATION' && (
            <div>
              <h3 className="font-semibold mb-4">Cancellation Policy</h3>
              <div className="space-y-3 max-w-lg">
                <div className="space-y-1.5">
                  <Label>Free cancellation window (hours before appointment)</Label>
                  <Input type="number" min="0" value={settings.cancellation.freeCancelHours}
                    onChange={(e) => updateSettings({ cancellation: { ...settings.cancellation, freeCancelHours: Number(e.target.value) } })} />
                  <p className="text-xs text-muted-foreground">Customers can cancel free up to this many hours before.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Late cancellation fee (%)</Label>
                  <Input type="number" min="0" max="100" value={settings.cancellation.lateCancelFeePercent}
                    onChange={(e) => updateSettings({ cancellation: { ...settings.cancellation, lateCancelFeePercent: Number(e.target.value) } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>No-show fee (%)</Label>
                  <Input type="number" min="0" max="100" value={settings.cancellation.noShowFeePercent}
                    onChange={(e) => updateSettings({ cancellation: { ...settings.cancellation, noShowFeePercent: Number(e.target.value) } })} />
                </div>
              </div>
            </div>
          )}

          {active === 'PAYMENT' && (
            <div>
              <h3 className="font-semibold mb-4">Accepted Payment Methods</h3>
              <div className="space-y-1">
                <ToggleRow label="Cash" desc="Accept cash payments"
                  checked={settings.payment.acceptCash}
                  onChange={(v) => updateSettings({ payment: { ...settings.payment, acceptCash: v } })} />
                <Separator />
                <ToggleRow label="Card" desc="Accept debit and credit cards"
                  checked={settings.payment.acceptCard}
                  onChange={(v) => updateSettings({ payment: { ...settings.payment, acceptCard: v } })} />
                <Separator />
                <ToggleRow label="UPI" desc="Accept UPI payments"
                  checked={settings.payment.acceptUPI}
                  onChange={(v) => updateSettings({ payment: { ...settings.payment, acceptUPI: v } })} />
                <Separator />
                <ToggleRow label="Net Banking" desc="Accept bank transfers"
                  checked={settings.payment.acceptNetBanking}
                  onChange={(v) => updateSettings({ payment: { ...settings.payment, acceptNetBanking: v } })} />
              </div>
            </div>
          )}

          {active === 'STAFF_PERMS' && (
            <div>
              <h3 className="font-semibold mb-4">Staff Permissions</h3>
              <div className="space-y-1">
                <ToggleRow label="Managers can edit services" desc="Allow managers to add, edit, and delete services"
                  checked={settings.staffPermissions.managerCanEditServices}
                  onChange={(v) => updateSettings({ staffPermissions: { ...settings.staffPermissions, managerCanEditServices: v } })} />
                <Separator />
                <ToggleRow label="Managers can manage staff" desc="Allow managers to add and remove staff"
                  checked={settings.staffPermissions.managerCanManageStaff}
                  onChange={(v) => updateSettings({ staffPermissions: { ...settings.staffPermissions, managerCanManageStaff: v } })} />
                <Separator />
                <ToggleRow label="Staff can see all bookings" desc="Allow staff to view all bookings, not just their own"
                  checked={settings.staffPermissions.staffCanSeeAllBookings}
                  onChange={(v) => updateSettings({ staffPermissions: { ...settings.staffPermissions, staffCanSeeAllBookings: v } })} />
                <Separator />
                <ToggleRow label="Staff can edit own schedule" desc="Allow staff to manage their own working hours"
                  checked={settings.staffPermissions.staffCanEditOwnSchedule}
                  onChange={(v) => updateSettings({ staffPermissions: { ...settings.staffPermissions, staffCanEditOwnSchedule: v } })} />
              </div>
            </div>
          )}

          {active === 'SECURITY' && (
            <div>
              <h3 className="font-semibold mb-4">Security</h3>
              <div className="space-y-1">
                <ToggleRow label="Two-factor authentication" desc="Require OTP at login"
                  checked={settings.security.twoFactor}
                  onChange={(v) => updateSettings({ security: { ...settings.security, twoFactor: v } })} />
                <Separator />
                <ToggleRow label="Login alerts" desc="Get notified of new device logins"
                  checked={settings.security.loginAlerts}
                  onChange={(v) => updateSettings({ security: { ...settings.security, loginAlerts: v } })} />
              </div>
              <div className="mt-5 p-3 rounded-lg bg-muted/30">
                <p className="text-sm font-medium flex items-center gap-2 mb-1"><Lock className="w-4 h-4 text-primary" /> Account safety</p>
                <p className="text-xs text-muted-foreground">Your data is stored locally in your browser. Resetting demo data will restore all booking, service, and customer information to its initial state.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from StyleSync?</AlertDialogTitle>
            <AlertDialogDescription>You will need to sign back in to manage your salon.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { resetData(); setLogoutOpen(false); }}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
