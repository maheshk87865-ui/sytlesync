'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState } from '../ui';
import { Avatar, StatusBadge, SafeImage, formatCurrency, formatTime } from '../shared';
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Scissors, Plus, Search, Edit, Trash2, Power, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceCategory } from '@/lib/types';

const CATEGORIES: ServiceCategory[] = ['Hair', 'Beard & Grooming', 'Skin & Beauty', 'Nails', 'Makeup', 'Other'];

export function ServicesView() {
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const toggleServiceActive = useSalonStore(s => s.toggleServiceActive);
  const deleteService = useSalonStore(s => s.deleteService);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...services];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'ALL') list = list.filter(s => s.category === categoryFilter);
    if (statusFilter !== 'ALL') list = list.filter(s => (statusFilter === 'ACTIVE' && s.active) || (statusFilter === 'INACTIVE' && !s.active));
    return list;
  }, [services, search, categoryFilter, statusFilter]);

  const activeCount = services.filter(s => s.active).length;

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle={`${services.length} services · ${activeCount} active`}
        action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Service</Button>}
      />

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Scissors} title="No services found" subtitle="Add a service to start offering it to customers."
          action={<Button onClick={() => setAddOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Service</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(svc => {
            const assignedStaff = staff.filter(st => svc.assignedStaff.includes(st.id));
            return (
              <div key={svc.id} className={cn('rounded-2xl border bg-card overflow-hidden flex flex-col', !svc.active && 'opacity-60')}>
                {svc.image && (
                  <div className="h-32 bg-muted relative">
                    <SafeImage
                      src={svc.image}
                      alt={svc.name}
                      className="w-full h-full object-cover"
                      fallbackClassName="w-full h-full flex items-center justify-center"
                      rounded="none"
                      showTextInFallback={false}
                    />
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={svc.active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-base">{svc.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{svc.category}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{svc.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold">{formatCurrency(svc.price)}</p>
                      <p className="text-xs text-muted-foreground">{svc.duration} min · {svc.totalBookings} bookings</p>
                    </div>
                  </div>
                  {assignedStaff.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="flex -space-x-2">
                        {assignedStaff.slice(0, 3).map(s => (
                          <img key={s.id} src={s.photo} alt={s.name} className="w-7 h-7 rounded-full border-2 border-card object-cover" />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignedStaff.length} staff{assignedStaff.length > 1 ? ' members' : ''}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditId(svc.id)}>
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleServiceActive(svc.id)}>
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteId(svc.id)} className="text-status-cancelled">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ServiceDialog open={addOpen} onOpenChange={setAddOpen} />
      <ServiceDialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)} editId={editId} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the service permanently. Existing bookings will be preserved but new bookings cannot be made.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteService(deleteId); setDeleteId(null); }}
              className="bg-status-cancelled text-white hover:bg-status-cancelled/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ServiceDialog({ open, onOpenChange, editId }: { open: boolean; onOpenChange: (o: boolean) => void; editId?: string | null }) {
  if (!open) return null;
  return <ServiceForm key={editId || 'new'} open={open} onOpenChange={onOpenChange} editId={editId} />;
}

function ServiceForm({ open, onOpenChange, editId }: { open: boolean; onOpenChange: (o: boolean) => void; editId?: string | null }) {
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const addService = useSalonStore(s => s.addService);
  const updateService = useSalonStore(s => s.updateService);

  const existing = editId ? services.find(s => s.id === editId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState<ServiceCategory>(existing?.category || 'Hair');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(String(existing?.price || ''));
  const [duration, setDuration] = useState(String(existing?.duration || '30'));
  const [image, setImage] = useState(existing?.image || '');
  const [assignedStaff, setAssignedStaff] = useState<string[]>(existing?.assignedStaff || []);
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (!name.trim()) { setError('Service name is required'); return; }
    if (!price || Number(price) <= 0) { setError('Valid price required'); return; }
    if (!duration || Number(duration) <= 0) { setError('Valid duration required'); return; }
    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      price: Number(price),
      duration: Number(duration),
      image: image.trim() || undefined,
      assignedStaff,
      active,
    };
    if (editId) updateService(editId, payload);
    else addService(payload);
    onOpenChange(false);
  };

  const toggleStaff = (id: string) => {
    setAssignedStaff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>{editId ? 'Update service details' : 'Create a new service offering'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && <p className="text-sm text-status-cancelled">{error}</p>}
          <div className="space-y-1.5">
            <Label>Service Name</Label>
            <Input placeholder="e.g. Haircut & Style" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Image URL (optional)</Label>
              <Input placeholder="https://..." value={image} onChange={(e) => setImage(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Short description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned Staff</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {staff.map(s => (
                <label key={s.id} className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  assignedStaff.includes(s.id) ? 'bg-accent border-primary' : 'border-border hover:bg-muted/40'
                )}>
                  <input type="checkbox" checked={assignedStaff.includes(s.id)} onChange={() => toggleStaff(s.id)} className="accent-primary" />
                  <span className="truncate">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-primary" />
            <span className="text-sm">Service is active (visible to customers)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editId ? 'Save Changes' : 'Add Service'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
