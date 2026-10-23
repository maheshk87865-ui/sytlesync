"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Star, Clock, Users, CheckCircle2, Calendar, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/salon-store";
import { useSheetBrowserHistory } from "@/lib/use-sheet-history";
import { getSalonById } from "@/lib/salon-data";
import { getServiceById, getStaffForService, formatPrice } from "@/lib/salon-services-data";
import { ArrowLeft } from "lucide-react";

export function ServiceDetailSheet() {
  const { serviceDetailSalonId, serviceDetailId, closeServiceDetail, openStaffProfile, setBookingSalon, setBookingPreselect } = useAppStore();
  const salon = serviceDetailSalonId ? getSalonById(serviceDetailSalonId) : undefined;
  const svc = serviceDetailSalonId && serviceDetailId ? getServiceById(serviceDetailSalonId, serviceDetailId) : undefined;
  const open = !!svc && !!salon;
  const { goBack } = useSheetBrowserHistory(open, closeServiceDetail);

  const handleBook = () => {
    if (!svc || !serviceDetailSalonId) return;
    setBookingPreselect(svc.id, null);
    setBookingSalon(serviceDetailSalonId);
    closeServiceDetail();
  };
  const handleSelectStaff = (staffId: string) => {
    if (!svc || !serviceDetailSalonId) return;
    setBookingPreselect(svc.id, staffId);
    setBookingSalon(serviceDetailSalonId);
    closeServiceDetail();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        {salon && (
          <button onClick={goBack} className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition hover:bg-white" aria-label={`Back to ${salon.name}`}>
            <ArrowLeft className="h-3.5 w-3.5" suppressHydrationWarning /> Back to {salon.name}
          </button>
        )}
        {svc && salon && (
          <>
            <div className="relative h-56 w-full sm:h-64">
              <img src={svc.image || salon.cover} alt={svc.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <SheetHeader className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="inline-flex w-fit items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">{svc.category}</div>
                <SheetTitle className="mt-2 text-2xl font-bold leading-tight text-white">{svc.name}</SheetTitle>
                <SheetDescription className="text-xs text-white/80">At {salon.name}</SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border bg-white p-4">
              <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Price</div><div className="text-lg font-bold text-foreground">{formatPrice(svc)}</div></div>
              <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</div><div className="text-lg font-bold text-foreground">{svc.durationLabel}</div></div>
              <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rating</div><div className="flex items-center gap-1 text-lg font-bold text-foreground"><Star className="h-4 w-4 ss-champagne fill-[#0EA5E9]" suppressHydrationWarning />{svc.rating.toFixed(1)}<span className="text-xs font-normal text-muted-foreground">({svc.reviews})</span></div></div>
            </div>
            <div className="space-y-6 p-4">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About this service</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{svc.description}</p>
              </section>
              {svc.whatsIncluded && svc.whatsIncluded.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">What&apos;s included</h3>
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {svc.whatsIncluded.map((item) => (<li key={item} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs text-foreground/85"><CheckCircle2 className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />{item}</li>))}
                  </ul>
                </section>
              )}
              {svc.addons && svc.addons.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Optional add-ons</h3>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {svc.addons.map((a) => (<div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-2.5"><span className="text-xs font-medium text-foreground">{a.name}</span><span className="text-xs font-semibold text-primary">+₹{a.price}</span></div>))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Add-ons are selected during booking.</p>
                </section>
              )}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Professionals for this service</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Users className="h-3 w-3" suppressHydrationWarning />{serviceDetailSalonId ? getStaffForService(serviceDetailSalonId, svc.id).length : 0} available</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {serviceDetailSalonId && getStaffForService(serviceDetailSalonId, svc.id).map((staff) => (
                    <div key={staff.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: staff.avatarColor }} suppressHydrationWarning>{staff.initials}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-foreground">{staff.name}</div>
                        <div className="text-xs text-muted-foreground">{staff.role}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px]">
                          <span className="font-medium text-foreground">{staff.yearsExperience} yrs exp</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-foreground"><Star className="h-3 w-3 ss-champagne fill-[#0EA5E9]" suppressHydrationWarning />{staff.rating.toFixed(1)}<span className="font-normal text-muted-foreground">({staff.reviews})</span></span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 border-border text-[11px] text-foreground hover:bg-secondary" onClick={() => serviceDetailSalonId && openStaffProfile(serviceDetailSalonId, staff.id)}>View Profile</Button>
                        <Button size="sm" className="h-7 bg-primary text-[11px] text-primary-foreground hover:bg-primary/90" onClick={() => handleSelectStaff(staff.id)}>Select</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-white/95 p-3 backdrop-blur">
              <div className="flex-1"><div className="text-[10px] text-muted-foreground">Total from</div><div className="text-base font-bold text-foreground">{formatPrice(svc)}</div></div>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBook}><Calendar className="mr-1.5 h-3.5 w-3.5" suppressHydrationWarning />Book This Service<ChevronRight className="ml-1 h-3.5 w-3.5" suppressHydrationWarning /></Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
