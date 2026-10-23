'use client';
import { useState } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState, BackButton } from '../ui';
import { StatusBadge, formatDate } from '../shared';
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
  LifeBuoy, Plus, MessageSquare, ChevronRight, HelpCircle, Mail, Phone, Clock
} from 'lucide-react';
import type { SupportTicket } from '@/lib/types';

const FAQS = [
  { q: 'How do I add a new service?', a: 'Go to Services > Add Service. Fill in name, category, price, duration, and assign staff who can perform it. Active services are visible to customers in the customer app.' },
  { q: 'Why is a booking time slot not available?', a: 'Slots become unavailable if the staff member is already booked, has scheduled time off, the salon is closed, or the time is blocked/break. Check Availability to see slot status.' },
  { q: 'How do I block a time slot?', a: 'Go to Availability, select the date, then click "Block Slot" or "Add Break". Blocked slots disappear from the customer booking flow.' },
  { q: 'Can customers see services I have deactivated?', a: 'No. Only services marked as Active are visible to customers in the customer app. Inactive services remain in your salon data and can be reactivated any time.' },
  { q: 'How does salon status affect bookings?', a: 'When the salon is marked Closed, customers cannot make new bookings. Existing bookings remain unchanged. You can also set temporary closures with a date range and reason.' },
  { q: 'How do I respond to customer reviews?', a: 'Go to Reviews, find the review, and click "Reply". Your reply will be visible to the customer and other potential customers.' },
];

export function SupportView() {
  const tickets = useSalonStore(s => s.tickets);
  const createTicket = useSalonStore(s => s.createTicket);

  const [createOpen, setCreateOpen] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  const sortedTickets = [...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (openTicketId) {
    return <TicketDetail ticketId={openTicketId} onBack={() => setOpenTicketId(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Get help and manage your tickets"
        action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> New Ticket</Button>}
      />

      {/* Contact options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="w-10 h-10 rounded-xl bg-accent/40 flex items-center justify-center mb-2">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-sm">Email Support</p>
          <p className="text-xs text-muted-foreground mt-1">partners@stylesync.in</p>
          <p className="text-xs text-muted-foreground">Reply within 24 hours</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="w-10 h-10 rounded-xl bg-accent/40 flex items-center justify-center mb-2">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-sm">Phone Support</p>
          <p className="text-xs text-muted-foreground mt-1">1800-123-4567</p>
          <p className="text-xs text-muted-foreground">Mon–Sat, 9 AM – 8 PM</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="w-10 h-10 rounded-xl bg-accent/40 flex items-center justify-center mb-2">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-sm">FAQ</p>
          <p className="text-xs text-muted-foreground mt-1">Quick answers</p>
          <button onClick={() => setShowFaq(s => !s)} className="text-xs text-primary hover:underline mt-1">
            {showFaq ? 'Hide' : 'View FAQs'}
          </button>
        </div>
      </div>

      {/* FAQ accordion */}
      {showFaq && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-5">
          <h3 className="font-semibold mb-3">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <details key={i} className="rounded-lg bg-muted/30 p-3 cursor-pointer group">
                <summary className="text-sm font-medium flex items-center justify-between list-none">
                  {f.q}
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                </summary>
                <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Tickets */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Your Tickets ({tickets.length})</h3>
        {sortedTickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No support tickets" subtitle="Create a ticket to report an issue."
            action={<Button onClick={() => setCreateOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Ticket</Button>} />
        ) : (
          <div className="space-y-2">
            {sortedTickets.map(t => (
              <button key={t.id} onClick={() => setOpenTicketId(t.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-accent/40 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.category} · Updated {formatDate(t.updatedAt).split(' ').slice(0, 2).join(' ')}</p>
                </div>
                <StatusBadge status={t.status} className="text-[10px] px-1.5 py-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} createTicket={createTicket} />
    </div>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const tickets = useSalonStore(s => s.tickets);
  const respondTicket = useSalonStore(s => s.respondTicket);
  const [reply, setReply] = useState('');

  const t = tickets.find(x => x.id === ticketId);
  if (!t) return null;

  const submit = () => {
    if (!reply.trim()) return;
    respondTicket(t.id, reply.trim());
    setReply('');
  };

  return (
    <div>
      <BackButton label="All Tickets" onClick={onBack} />
      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">{t.subject}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.category} · {t.priority} priority · Created {formatDate(t.createdAt)}</p>
          </div>
          <StatusBadge status={t.status} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Conversation</h3>
        <div className="space-y-3 mb-4">
          {t.responses.map((r, i) => (
            <div key={i} className={`flex ${r.from === 'salon' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${r.from === 'salon' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-xs opacity-80 mb-1">{r.from === 'salon' ? 'You' : 'StyleSync Support'}</p>
                <p className="text-sm">{r.message}</p>
                <p className="text-[10px] opacity-60 mt-1">{new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            </div>
          ))}
        </div>
        {t.status !== 'CLOSED' && (
          <div className="flex gap-2">
            <Textarea rows={2} placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
            <Button onClick={submit} disabled={!reply.trim()}>Send</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTicketDialog({ open, onOpenChange, createTicket }: { open: boolean; onOpenChange: (o: boolean) => void; createTicket: any }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Booking Problem');
  const [priority, setPriority] = useState<SupportTicket['priority']>('Medium');
  const [description, setDescription] = useState('');

  const submit = () => {
    if (!subject.trim() || !description.trim()) return;
    createTicket(subject.trim(), category, priority, description.trim());
    onOpenChange(false);
    setSubject(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>Report an issue or request help.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input placeholder="Brief summary of the issue" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Booking Problem">Booking Problem</SelectItem>
                  <SelectItem value="Payment Issue">Payment Issue</SelectItem>
                  <SelectItem value="Technical Problem">Technical Problem</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={4} placeholder="Describe your issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
