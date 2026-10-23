'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState, BackButton } from '../ui';
import { Avatar, StatusBadge, formatCurrency, formatTime, todayStr } from '../shared';
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
  UserRound, Plus, Search, Edit, Phone, Mail, Calendar as CalIcon, Clock, Power, Ban, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StaffRole } from '@/lib/types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

export function StaffView() {
  const staff = useSalonStore(s => s.staff);
  const services = useSalonStore(s => s.services);
  const bookings = useSalonStore(s => s.bookings);
  const selectStaff = useSalonStore(s => s.selectStaff);
  const selectedStaffId = useSalonStore(s => s.selectedStaffId);
  const toggleStaffStatus = useSalonStore(s => s.toggleStaffStatus);

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase();
    return staff.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [staff, search]);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  if (selectedStaff) {
    return <StaffProfile staffId={selectedStaff.id} onBack={() => selectStaff(null)} onEdit={() => setEditId(selectedStaff.id)} />;
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} staff · ${staff.filter(s => s.status === 'ACTIVE').length} active`}
        action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Staff</Button>}
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserRound} title="No staff found" subtitle="Add staff to manage their schedules and assignments."
          action={<Button onClick={() => setAddOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Staff</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => {
            const staffBookings = bookings.filter(b => b.staffId === s.id);
            const completedCount = staffBookings.filter(b => b.status === 'COMPLETED').length;
            const revenue = staffBookings.filter(b => b.status === 'COMPLETED' && b.paymentStatus === 'PAID').reduce((sum, b) => sum + b.price, 0);
            const staffServices = services.filter(sv => s.services.includes(sv.id));
            return (
              <button
                key={s.id}
                onClick={() => selectStaff(s.id)}
                className={cn('text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all', s.status === 'INACTIVE' && 'opacity-60')}
              >
                <div className="flex items-start gap-3">
                  <Avatar src={s.photo} alt={s.name} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{s.name}</p>
                      <StatusBadge status={s.status} className="text-[10px] px-1.5 py-0.5" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.role} · {s.experience}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold">{staffServices.length}</p>
                    <p className="text-[10px] text-muted-foreground">Services</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold">{completedCount}</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold">{formatCurrency(revenue).replace('₹', '₹')}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <StaffDialog open={addOpen} onOpenChange={setAddOpen} />
      <StaffDialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)} editId={editId} />
    </div>
  );
}

function StaffProfile({ staffId, onBack, onEdit }: { staffId: string; onBack: () => void; onEdit: () => void }) {
  const staff = useSalonStore(s => s.staff);
  const services = useSalonStore(s => s.services);
  const bookings = useSalonStore(s => s.bookings);
  const salon = useSalonStore(s => s.salon);
  const toggleStaffStatus = useSalonStore(s => s.toggleStaffStatus);
  const addStaffUnavailability = useSalonStore(s => s.addStaffUnavailability);
  const removeStaffUnavailability = useSalonStore(s => s.removeStaffUnavailability);
  const selectBooking = useSalonStore(s => s.selectBooking);
  const setView = useSalonStore(s => s.setView);

  const [unavailOpen, setUnavailOpen] = useState(false);

  const s = staff.find(x => x.id === staffId);
  if (!s) return null;

  const staffBookings = bookings.filter(b => b.staffId === staffId).sort((a, b) => b.date.localeCompare(a.date));
  const completedCount = staffBookings.filter(b => b.status === 'COMPLETED').length;
  const cancelledCount = staffBookings.filter(b => b.status === 'CANCELLED').length;
  const revenue = staffBookings.filter(b => b.status === 'COMPLETED' && b.paymentStatus === 'PAID').reduce((sum, b) => sum + b.price, 0);
  const staffServices = services.filter(sv => s.services.includes(sv.id));

  const openBooking = (id: string) => { selectBooking(id); setView('bookings'); };

  return (
    <div>
      <BackButton label="All Staff" onClick={onBack} />

      {/* Staff header */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar src={s.photo} alt={s.name} size={80} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{s.name}</h2>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{s.role} · {s.experience} experience</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</span>}
              {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-4 h-4 mr-1.5" /> Edit</Button>
            <Button variant="outline" size="sm" onClick={() => toggleStaffStatus(s.id)}>
              <Power className="w-4 h-4 mr-1.5" /> {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Total Bookings</p>
          <p className="text-lg font-bold">{staffBookings.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-lg font-bold">{completedCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Cancelled</p>
          <p className="text-lg font-bold">{cancelledCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-lg font-bold">{formatCurrency(revenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Schedule */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Weekly Schedule</h3>
          </div>
          <div className="space-y-1.5">
            {DAYS.map(day => {
              const ds = s.schedule[day];
              return (
                <div key={day} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <span className="font-medium text-sm">{DAY_LABELS[day]}</span>
                  {ds.off ? (
                    <StatusBadge status="CLOSED" className="text-[10px] px-1.5 py-0.5" />
                  ) : (
                    <span className="text-sm">{formatTime(ds.start)} – {formatTime(ds.end)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unavailability */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Time Off / Unavailability</h3>
            <Button size="sm" variant="outline" onClick={() => setUnavailOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
          {(s.unavailability || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No time off scheduled.</p>
          ) : (
            <div className="space-y-1.5">
              {(s.unavailability || []).map((u, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{new Date(u.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(u.startTime)} – {formatTime(u.endTime)} · {u.reason}</p>
                  </div>
                  <button onClick={() => removeStaffUnavailability(s.id, idx)} className="text-status-cancelled hover:underline text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned services */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Assigned Services ({staffServices.length})</h3>
          <div className="space-y-1.5">
            {staffServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No services assigned.</p>
            ) : staffServices.map(sv => (
              <div key={sv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{sv.name}</p>
                  <p className="text-xs text-muted-foreground">{sv.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(sv.price)}</p>
                  <p className="text-xs text-muted-foreground">{sv.duration}min</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Recent Bookings</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto scroll-area-custom">
            {staffBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No bookings yet.</p>
            ) : staffBookings.slice(0, 10).map(b => (
              <button key={b.id} onClick={() => openBooking(b.id)}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.customerName} · {b.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {formatTime(b.startTime)}</p>
                </div>
                <span className="text-xs font-semibold">{formatCurrency(b.price)}</span>
                <StatusBadge status={b.status} className="text-[10px] px-1.5 py-0.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <StaffUnavailabilityDialog open={unavailOpen} onOpenChange={setUnavailOpen} staffId={s.id} />
    </div>
  );
}

function StaffUnavailabilityDialog({ open, onOpenChange, staffId }: { open: boolean; onOpenChange: (o: boolean) => void; staffId: string }) {
  const addStaffUnavailability = useSalonStore(s => s.addStaffUnavailability);
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('Personal');

  const submit = () => {
    if (!date || !startTime || !endTime) return;
    addStaffUnavailability(staffId, date, startTime, endTime, reason);
    onOpenChange(false);
    setStartTime(''); setEndTime(''); setReason('Personal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unavailability</DialogTitle>
          <DialogDescription>This staff member will be unavailable for the selected time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffDialog({ open, onOpenChange, editId }: { open: boolean; onOpenChange: (o: boolean) => void; editId?: string | null }) {
  if (!open) return null;
  return <StaffForm key={editId || 'new'} open={open} onOpenChange={onOpenChange} editId={editId} />;
}

function StaffForm({ open, onOpenChange, editId }: { open: boolean; onOpenChange: (o: boolean) => void; editId?: string | null }) {
  const staff = useSalonStore(s => s.staff);
  const services = useSalonStore(s => s.services);
  const addStaff = useSalonStore(s => s.addStaff);
  const updateStaff = useSalonStore(s => s.updateStaff);

  const existing = editId ? staff.find(s => s.id === editId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [role, setRole] = useState<StaffRole>(existing?.role || 'Staff');
  const [photo, setPhoto] = useState(existing?.photo || '');
  const [experience, setExperience] = useState(existing?.experience || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [services_, setServices] = useState<string[]>(existing?.services || []);
  const [schedule, setSchedule] = useState(existing?.schedule || {
    monday: { start: '09:00', end: '18:00', off: false },
    tuesday: { start: '09:00', end: '18:00', off: false },
    wednesday: { start: '09:00', end: '18:00', off: false },
    thursday: { start: '09:00', end: '18:00', off: false },
    friday: { start: '09:00', end: '18:00', off: false },
    saturday: { start: '09:00', end: '17:00', off: false },
    sunday: { start: '', end: '', off: true },
  });
  const [error, setError] = useState('');

  const toggleService = (id: string) => setServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const updateDay = (day: string, field: string, value: any) =>
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day as keyof typeof prev], [field]: value } }));

  const submit = () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    const payload = {
      name: name.trim(), role, photo: photo.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=B76E79&color=fff`,
      experience: experience.trim() || 'New', phone: phone.trim(), email: email.trim(),
      services: services_, schedule, status: 'ACTIVE' as const,
    };
    if (editId) updateStaff(editId, payload);
    else addStaff(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle>
          <DialogDescription>{editId ? 'Update staff information' : 'Add a new staff member'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && <p className="text-sm text-status-cancelled">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ria Mahajan" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Experience</Label>
              <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="5 years" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@salon.in" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Photo URL (optional)</Label>
            <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Assigned Services</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {services.map(sv => (
                <label key={sv.id} className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  services_.includes(sv.id) ? 'bg-accent border-primary' : 'border-border hover:bg-muted/40'
                )}>
                  <input type="checkbox" checked={services_.includes(sv.id)} onChange={() => toggleService(sv.id)} className="accent-primary" />
                  <span className="truncate">{sv.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Weekly Schedule</Label>
            <div className="space-y-1.5">
              {DAYS.map(day => {
                const ds = schedule[day];
                return (
                  <div key={day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="font-medium text-sm w-12">{DAY_LABELS[day]}</span>
                    <input type="time" value={ds.start} disabled={ds.off} onChange={(e) => updateDay(day, 'start', e.target.value)} className="text-xs px-2 py-1 rounded bg-card border border-border flex-1 disabled:opacity-50" />
                    <input type="time" value={ds.end} disabled={ds.off} onChange={(e) => updateDay(day, 'end', e.target.value)} className="text-xs px-2 py-1 rounded bg-card border border-border flex-1 disabled:opacity-50" />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={ds.off} onChange={(e) => updateDay(day, 'off', e.target.checked)} className="accent-primary" />
                      Off
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editId ? 'Save Changes' : 'Add Staff'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
