"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Star, Clock, Calendar, ChevronRight, Briefcase, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/lib/salon-store";
import { useSheetBrowserHistory } from "@/lib/use-sheet-history";
import { getSalonById } from "@/lib/salon-data";
import { getStaffById, getServicesForStaff, formatPrice } from "@/lib/salon-services-data";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function formatHour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

export function StaffProfileSheet() {
  const { staffProfileSalonId, staffProfileId, closeStaffProfile, setBookingSalon, setBookingPreselect } = useAppStore();
  const salon = staffProfileSalonId ? getSalonById(staffProfileSalonId) : undefined;
  const staff = staffProfileSalonId && staffProfileId ? getStaffById(staffProfileSalonId, staffProfileId) : undefined;
  const open = !!staff && !!salon;
  const { goBack } = useSheetBrowserHistory(open, closeStaffProfile);

  const handleBookWith = (serviceId?: string) => {
    if (!staff || !staffProfileSalonId) return;
    setBookingPreselect(serviceId ?? null, staff.id);
    setBookingSalon(staffProfileSalonId);
    closeStaffProfile();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        {salon && (
          <button onClick={goBack} className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition hover:bg-white" aria-label={`Back to ${salon.name}`}>
            <ArrowLeft className="h-3.5 w-3.5" suppressHydrationWarning /> Back to {salon.name}
          </button>
        )}
        {staff && salon && (
          <>
            <div className="relative ss-brand-gradient p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full text-xl font-bold ring-2 ring-white/30" style={{ backgroundColor: staff.avatarColor }} suppressHydrationWarning>{staff.initials}</div>
                <div>
                  <SheetTitle className="text-xl font-bold text-white">{staff.name}</SheetTitle>
                  <SheetDescription className="text-sm text-white/85">{staff.role} · {staff.yearsExperience} years experience</SheetDescription>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold"><Star className="h-3 w-3 fill-white text-white" suppressHydrationWarning />{staff.rating.toFixed(1)}<span className="text-white/80">· {staff.reviews} reviews</span></div>
                </div>
              </div>
            </div>
            <div className="space-y-6 p-4">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{staff.bio}</p>
              </section>
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Specializes in</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {staff.specializations.map((s) => (<span key={s} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary"><Briefcase className="h-3 w-3" suppressHydrationWarning />{s}</span>))}
                </div>
              </section>
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Working hours</h3>
                <div className="mt-2 rounded-xl border border-border bg-white p-3 text-sm">
                  <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-foreground"><Clock className="h-4 w-4 text-primary" suppressHydrationWarning />{formatHour(staff.workingHours.start)} – {formatHour(staff.workingHours.end)}</span></div>
                  {staff.breaks && staff.breaks.length > 0 && (<div className="mt-1.5 text-xs text-muted-foreground">Break: {staff.breaks.map((b) => `${formatHour(b.start)} – ${formatHour(b.end)}`).join(", ")}</div>)}
                  {staff.daysOff && staff.daysOff.length > 0 && (<div className="mt-0.5 text-xs text-muted-foreground">Day off: {staff.daysOff.map((d) => DAY_NAMES[d]).join(", ")}</div>)}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Services provided</h3>
                <div className="grid grid-cols-1 gap-2">
                  {staffProfileSalonId && getServicesForStaff(staffProfileSalonId, staff.id).map((svc) => (
                    <div key={svc.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                      <img src={svc.image || salon.cover} alt={svc.name} className="h-12 w-12 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{svc.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" suppressHydrationWarning />{svc.durationLabel}<Star className="h-3 w-3 ss-champagne fill-[#0EA5E9]" suppressHydrationWarning />{svc.rating.toFixed(1)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{formatPrice(svc)}</div>
                        <Button size="sm" variant="outline" className="mt-1 h-7 border-primary/30 px-2 text-[11px] text-primary hover:bg-secondary" onClick={() => handleBookWith(svc.id)}>Book</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-white/95 p-3 backdrop-blur">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleBookWith(undefined)}><Calendar className="mr-1.5 h-3.5 w-3.5" suppressHydrationWarning />Book with {staff.name.split(" ")[0]}<ChevronRight className="ml-1 h-3.5 w-3.5" suppressHydrationWarning /></Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
