'use client';
import { useState, useMemo } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader, EmptyState } from '../ui';
import { Avatar, Stars, formatDate } from '../shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Star, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReviewsView() {
  const reviews = useSalonStore(s => s.reviews);
  const salon = useSalonStore(s => s.salon);
  const replyToReview = useSalonStore(s => s.replyToReview);

  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars, count: reviews.filter(r => r.rating === stars).length,
    percent: totalReviews > 0 ? Math.round(reviews.filter(r => r.rating === stars).length / totalReviews * 100) : 0,
  }));

  const sortedReviews = useMemo(() => [...reviews].sort((a, b) => b.date.localeCompare(a.date)), [reviews]);

  const handleReplySubmit = () => {
    if (!replyId || !replyText.trim()) return;
    replyToReview(replyId, replyText.trim());
    setReplyId(null);
    setReplyText('');
  };

  return (
    <div>
      <PageHeader title="Reviews" subtitle={`${totalReviews} reviews · ${avgRating.toFixed(1)} average`} />

      {/* Overview card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-4xl font-bold text-primary">{avgRating.toFixed(1)}</p>
          <Stars rating={avgRating} size={18} />
          <p className="text-xs text-muted-foreground mt-1">Overall rating · {totalReviews} reviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
          <p className="text-sm font-medium mb-3">Rating Distribution</p>
          <div className="space-y-1.5">
            {distribution.map(d => (
              <div key={d.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium">{d.stars}</span>
                  <Star className="w-3.5 h-3.5 fill-status-completed text-status-completed" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-status-completed transition-all" style={{ width: `${d.percent}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{d.count} ({d.percent}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent reviews */}
      {sortedReviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" subtitle="Reviews from your customers will appear here." />
      ) : (
        <div className="space-y-3">
          {sortedReviews.map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar src={r.customerImage} alt={r.customerName} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">{r.customerName}</p>
                      <p className="text-xs text-muted-foreground">{r.serviceName} · {r.staffName} · {formatDate(r.date)}</p>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  <p className="text-sm mt-2">{r.comment}</p>
                  {r.salonReply ? (
                    <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-accent">
                      <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Salon reply · {r.repliedAt && formatDate(r.repliedAt).split(' ').slice(0, 2).join(' ')}
                      </p>
                      <p className="text-sm">{r.salonReply}</p>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setReplyId(r.id)}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Reply
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!replyId} onOpenChange={(o) => { if (!o) { setReplyId(null); setReplyText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>Your reply will be visible to the customer and other potential customers.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea rows={4} placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyId(null); setReplyText(''); }}>Cancel</Button>
            <Button onClick={handleReplySubmit}><Send className="w-4 h-4 mr-1.5" /> Post Reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
