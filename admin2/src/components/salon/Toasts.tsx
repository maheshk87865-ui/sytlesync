'use client';
import { useSalonStore } from '@/lib/store';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toasts() {
  const toasts = useSalonStore(s => s.toasts);
  const dismiss = useSalonStore(s => s.dismissToast);
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 bg-card border rounded-xl shadow-lg p-3 pr-2 min-w-[280px] animate-in slide-in-from-bottom-2 fade-in',
            t.type === 'success' && 'border-status-completed/40',
            t.type === 'error' && 'border-status-cancelled/40',
            t.type === 'info' && 'border-status-upcoming/40'
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-status-completed shrink-0 mt-0.5" />}
          {t.type === 'error' && <XCircle className="w-5 h-5 text-status-cancelled shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-status-upcoming shrink-0 mt-0.5" />}
          <p className="text-sm font-medium flex-1 pt-0.5">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
