"use client";

import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Bell, CreditCard, ShieldCheck, Settings as SettingsIcon, HelpCircle, LogOut,
  CheckCircle2, Clock, Calendar, Sparkles, ChevronRight, ChevronLeft, X,
  Plus, Check, AlertCircle, Mail, Phone, User, MapPin, Eye, Database,
  Info, FileText, Lock, Star, Trash2, CreditCard as CardIcon, Wallet, Search,
  Send, MessageSquare, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileStore, type ProfileSheetId, type PaymentMethodType } from "@/lib/profile-store";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/salon-store";
import { useAiPhotoStore } from "@/lib/ai-photo-store";
import { useSheetBrowserHistory } from "@/lib/use-sheet-history";
import { getSalonById, formatINR } from "@/lib/salon-data";
import {
  HELP_TOPICS, DEMO_BOOKINGS, DEFAULT_SAVED_LOOKS,
  DEMO_AREAS, SERVICE_CATEGORIES_FOR_PREFERENCES, SUPPORT_TOPICS,
} from "@/lib/profile-demo-data";

/* Icon resolver for notifications (iconName stored as string) */
const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string; suppressHydrationWarning?: boolean }>> = {
  CheckCircle2, Clock, Calendar, Sparkles, ShieldCheck, Bell, Star,
};

/* ===================================================================== */
/* Top-level Sheet Manager                                                */
/* ===================================================================== */

export function ProfileSheetManager() {
  const { activeSheet, closeSheet, activeHelpTopicId, activeSupportTicketId } = useProfileStore();

  return (
    <>
      <NotificationsSheet />
      <PaymentMethodsSheet />
      <AddPaymentMethodSheet />
      <TrustVerificationSheet />
      <SettingsSheet />
      <EditProfileSheet />
      <ServicePreferencesSheet />
      <NotificationPreferencesSheet />
      <HelpSupportSheet />
      <HelpTopicSheet />
      <ContactSupportSheet />
      <SupportTicketSheet />
      <SignOutConfirmDialog />
      {/* Suppress unused warnings for nested state hooks */}
      <div className="hidden">{activeSheet ? "" : ""}{activeHelpTopicId ? "" : ""}{activeSupportTicketId ? "" : ""}</div>
    </>
  );
}

/* Small reusable subheader inside sheets */
function SheetSubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function DemoNotice({ text }: { text?: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3 text-[10px] text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" suppressHydrationWarning />
      <span>{text ?? "StyleSync is a prototype. Data shown here is DEMO DATA and does not represent real accounts or transactions."}</span>
    </div>
  );
}

/* ===================================================================== */
/* 1. Notifications Sheet                                                 */
/* ===================================================================== */

function NotificationsSheet() {
  const { activeSheet, closeSheet, notifications, markAllNotificationsRead, clearReadNotifications, markNotificationRead, openSheet } = useProfileStore();
  const { setSelectedSalon, setView, setBookingSalon } = useAppStore();
  const open = activeSheet === "notifications";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const grouped: Record<string, typeof notifications> = {};
  for (const n of notifications) {
    if (!grouped[n.section]) grouped[n.section] = [];
    grouped[n.section].push(n);
  }
  const order = ["Today", "Yesterday", "Earlier"];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleAction = (n: typeof notifications[number]) => {
    markNotificationRead(n.id);
    closeSheet();
    if (n.actionType === "view-booking" && n.actionPayload) {
      setBookingSalon(n.actionPayload);
    } else if (n.actionType === "view-salon" && n.actionPayload) {
      setSelectedSalon(n.actionPayload);
    } else if (n.actionType === "view-ai") {
      setView("ai");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" suppressHydrationWarning />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount} new
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">Recent activity from your bookings, salons and AI recommendations.</SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <Button size="sm" variant="outline" className="flex-1 border-border/60 text-xs" onClick={markAllNotificationsRead} disabled={unreadCount === 0}>
            <Check className="mr-1 h-3.5 w-3.5" suppressHydrationWarning /> Mark all as read
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-border/60 text-xs" onClick={clearReadNotifications} disabled={!notifications.some((n) => n.read)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" suppressHydrationWarning /> Clear read
          </Button>
        </div>

        <div className="p-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-secondary/30 px-6 py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" suppressHydrationWarning />
              <p className="mt-2 text-sm font-semibold">You&apos;re all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">New notifications will appear here.</p>
            </div>
          ) : (
            order.map((section) => {
              const list = grouped[section];
              if (!list || list.length === 0) return null;
              return (
                <div key={section} className="mb-4">
                  <SheetSubHeading>{section}</SheetSubHeading>
                  <div className="space-y-2">
                    {list.map((n) => {
                      const Icon = NOTIFICATION_ICONS[n.iconName] ?? Bell;
                      return (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => markNotificationRead(n.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); markNotificationRead(n.id); } }}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition",
                            n.read
                              ? "border-border/40 bg-card/50 opacity-70"
                              : "border-primary/30 bg-secondary/40 hover:bg-secondary"
                          )}
                        >
                          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", n.read ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary")}>
                            <Icon className="h-4 w-4" suppressHydrationWarning />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-semibold text-foreground">{n.title}</div>
                              {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">{n.timestamp}</span>
                              {n.actionLabel && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAction(n); }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                >
                                  {n.actionLabel} <ChevronRight className="h-3 w-3" suppressHydrationWarning />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          <button
            onClick={() => openSheet("notification-preferences")}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-border/60 bg-card p-3 text-left text-sm font-medium hover:bg-secondary"
          >
            <SettingsIcon className="h-4 w-4 text-primary" suppressHydrationWarning />
            <span className="flex-1">Notification preferences</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
          </button>

          <DemoNotice />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 2. Payment Methods Sheet                                              */
/* ===================================================================== */

function PaymentMethodsSheet() {
  const { activeSheet, closeSheet, paymentMethods, setDefaultPaymentMethod, removePaymentMethod, openSheet } = useProfileStore();
  const open = activeSheet === "payment-methods";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const iconFor = (type: PaymentMethodType) => type === "upi" ? Wallet : type === "card" ? CardIcon : Wallet;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" suppressHydrationWarning />
            Payment methods
          </SheetTitle>
          <SheetDescription className="text-xs">Demo payment methods — no real payment is processed.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <SheetSubHeading>Payment methods</SheetSubHeading>

          {paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-secondary/30 px-6 py-12 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground" suppressHydrationWarning />
              <p className="mt-2 text-sm font-semibold">No payment methods</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a demo UPI, card or wallet to get started.</p>
            </div>
          ) : (
            paymentMethods.map((pm) => {
              const Icon = iconFor(pm.type);
              return (
                <div key={pm.id} className={cn("flex items-center gap-3 rounded-2xl border p-3", pm.isDefault ? "border-primary/40 bg-secondary/40" : "border-border/60 bg-card")}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="h-5 w-5" suppressHydrationWarning />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                      {pm.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          <Check className="h-2.5 w-2.5" suppressHydrationWarning /> Default
                        </span>
                      )}
                    </div>
                    {pm.subLabel && <div className="text-xs text-muted-foreground">{pm.subLabel}</div>}
                    <div className="text-[10px] text-muted-foreground">Added {pm.addedDate}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!pm.isDefault && (
                      <button
                        onClick={() => setDefaultPaymentMethod(pm.id)}
                        className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-secondary"
                      >
                        Set as default
                      </button>
                    )}
                    <button
                      onClick={() => removePaymentMethod(pm.id)}
                      className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <Button
            variant="outline"
            className="w-full border-dashed border-primary/40 text-primary hover:bg-secondary"
            onClick={() => openSheet("add-payment-method")}
          >
            <Plus className="mr-2 h-4 w-4" suppressHydrationWarning /> Add Payment Method
          </Button>

          <DemoNotice />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 3. Add Payment Method Sheet                                           */
/* ===================================================================== */

function AddPaymentMethodSheet() {
  const { activeSheet, closeSheet, addPaymentMethod } = useProfileStore();
  const open = activeSheet === "add-payment-method";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const [type, setType] = useState<PaymentMethodType>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [walletName, setWalletName] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (type === "upi") {
      if (!upiId.trim()) return;
      addPaymentMethod({ type: "upi", label: upiId.trim(), subLabel: "UPI" });
    } else if (type === "card") {
      const last4 = cardNumber.replace(/\s/g, "").slice(-4) || "4242";
      addPaymentMethod({
        type: "card",
        label: `•••• •••• •••• ${last4}`,
        subLabel: `Expires ${expiry || "12/29"}`,
      });
    } else {
      if (!walletName.trim()) return;
      addPaymentMethod({ type: "wallet", label: walletName.trim(), subLabel: "Wallet" });
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setUpiId(""); setCardNumber(""); setCardName(""); setExpiry(""); setWalletName("");
      goBack();
    }, 1000);
  };

  const typeOptions: { id: PaymentMethodType; label: string; icon: React.ComponentType<{ className?: string; suppressHydrationWarning?: boolean }> }[] = [
    { id: "upi", label: "UPI", icon: Wallet },
    { id: "card", label: "Debit / Credit Card", icon: CardIcon },
    { id: "wallet", label: "Demo Wallet", icon: Wallet },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" suppressHydrationWarning />
            Add Payment Method
          </SheetTitle>
          <SheetDescription className="text-xs">Demo only — no real payment will be processed.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <SheetSubHeading>Choose type</SheetSubHeading>
          <div className="grid grid-cols-3 gap-2">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = type === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition",
                    active ? "border-primary bg-secondary/60 text-primary" : "border-border/60 bg-card text-foreground/80 hover:bg-secondary"
                  )}
                >
                  <Icon className="h-5 w-5" suppressHydrationWarning />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {type === "upi" && (
            <div className="space-y-2">
              <SheetSubHeading>UPI ID</SheetSubHeading>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="demo@upi"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40"
              />
              <p className="text-[10px] text-muted-foreground">Use any demo UPI ID — no real UPI PIN or verification is requested.</p>
            </div>
          )}

          {type === "card" && (
            <div className="space-y-3">
              <div>
                <SheetSubHeading>Card number</SheetSubHeading>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <SheetSubHeading>Name on card</SheetSubHeading>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Demo User"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <SheetSubHeading>Expiry (MM/YY)</SheetSubHeading>
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/29"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">CVV is never requested — this is a demo card form. Use any test card number.</p>
            </div>
          )}

          {type === "wallet" && (
            <div className="space-y-2">
              <SheetSubHeading>Wallet name</SheetSubHeading>
              <input
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Demo Pay"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40"
              />
              <p className="text-[10px] text-muted-foreground">Demo wallet only — no real wallet credentials are requested.</p>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3 text-[10px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0 text-primary" suppressHydrationWarning />
            Demo payment method — no real payment will be processed.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={goBack}>Cancel</Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saved}>
              {saved ? (<><Check className="mr-1 h-4 w-4" suppressHydrationWarning /> Saved</>) : "Save Demo Payment Method"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 4. Trust & Verification Sheet                                         */
/* ===================================================================== */

function TrustVerificationSheet() {
  const { activeSheet, closeSheet, verification, accountSecurity, setAccountSecurity } = useProfileStore();
  const open = activeSheet === "trust-verification";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const items = [
    { label: "Identity verification", verified: verification.identity, icon: ShieldCheck },
    { label: "Email", verified: verification.email, icon: Mail },
    { label: "Mobile number", verified: verification.mobile, icon: Phone },
    { label: "Profile", verified: verification.profile, icon: User },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" suppressHydrationWarning />
            Trust &amp; Verification
          </SheetTitle>
          <SheetDescription className="text-xs">Demo verification status — no real identity check is performed.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <SheetSubHeading>Verification status</SheetSubHeading>
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary">
                    <Icon className="h-4 w-4" suppressHydrationWarning />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                  </div>
                  {item.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      <Check className="h-2.5 w-2.5" suppressHydrationWarning /> Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pending</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-accent" suppressHydrationWarning />
            <div className="mt-2 text-base font-bold text-foreground">VERIFIED DEMO USER</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Verification shown here is demo data for the StyleSync prototype.</p>
          </div>

          <SheetSubHeading>Account security</SheetSubHeading>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
              <div>
                <div className="text-sm font-medium text-foreground">Login security</div>
                <div className="text-[11px] text-muted-foreground">Protected</div>
              </div>
              <ShieldCheck className="h-4 w-4 text-accent" suppressHydrationWarning />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
              <div>
                <div className="text-sm font-medium text-foreground">Two-step verification</div>
                <div className="text-[11px] text-muted-foreground">Add an extra layer of demo security</div>
              </div>
              <Switch checked={accountSecurity.twoStepVerification} onCheckedChange={(v) => setAccountSecurity({ twoStepVerification: v })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
              <div>
                <div className="text-sm font-medium text-foreground">Login alerts</div>
                <div className="text-[11px] text-muted-foreground">Get notified on demo logins</div>
              </div>
              <Switch checked={accountSecurity.loginAlerts} onCheckedChange={(v) => setAccountSecurity({ loginAlerts: v })} />
            </div>
          </div>

          <DemoNotice text="Verification shown here is demo data for the StyleSync prototype. No real government ID, Aadhaar, PAN or passport was checked." />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 5. Settings Sheet                                                     */
/* ===================================================================== */

function SettingsSheet() {
  const { activeSheet, closeSheet, openSheet, user, settings } = useProfileStore();
  const open = activeSheet === "settings";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const accountItems = [
    { label: "Edit profile", value: user.name, icon: User, sheet: "edit-profile" as const },
    { label: "Preferences", value: `${user.preferredServices.length} services`, icon: SettingsIcon, sheet: "service-preferences" as const },
    { label: "Notifications", value: "On", icon: Bell, sheet: "notification-preferences" as const },
  ];
  const privacyItems = [
    { label: "Profile visibility", value: settings.profileVisibility === "public" ? "Public" : "Private", icon: Eye, action: () => {
      useProfileStore.getState().setSettings({ profileVisibility: settings.profileVisibility === "public" ? "private" : "public" });
    } },
    { label: "Saved data", value: "Demo data", icon: Database, action: undefined as undefined | (() => void) },
  ];
  const appItems = [
    { label: "Location", value: user.city, icon: MapPin, action: undefined as undefined | (() => void) },
    { label: "Language", value: settings.language, icon: FileText, action: undefined as undefined | (() => void) },
    { label: "Appearance", value: settings.appearance, icon: Sparkles, action: undefined as undefined | (() => void) },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="h-5 w-5 text-primary" suppressHydrationWarning />
            Settings
          </SheetTitle>
          <SheetDescription className="text-xs">Manage your demo account, preferences and app settings.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-5">
          <div>
            <SheetSubHeading>Account</SheetSubHeading>
            <div className="space-y-1 rounded-2xl border border-border/60 bg-card p-2">
              {accountItems.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    onClick={() => openSheet(it.sheet)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-primary">
                      <Icon className="h-4 w-4" suppressHydrationWarning />
                    </div>
                    <span className="flex-1 text-left font-medium">{it.label}</span>
                    {it.value && <span className="text-xs text-muted-foreground">{it.value}</span>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SheetSubHeading>Privacy</SheetSubHeading>
            <div className="space-y-1 rounded-2xl border border-border/60 bg-card p-2">
              {privacyItems.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    onClick={() => it.action?.()}
                    disabled={!it.action}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary disabled:opacity-70"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-primary">
                      <Icon className="h-4 w-4" suppressHydrationWarning />
                    </div>
                    <span className="flex-1 text-left font-medium">{it.label}</span>
                    {it.value && <span className="text-xs text-muted-foreground">{it.value}</span>}
                    {it.action && <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SheetSubHeading>App</SheetSubHeading>
            <div className="space-y-1 rounded-2xl border border-border/60 bg-card p-2">
              {appItems.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    onClick={() => it.action?.()}
                    disabled={!it.action}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary disabled:opacity-70"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-primary">
                      <Icon className="h-4 w-4" suppressHydrationWarning />
                    </div>
                    <span className="flex-1 text-left font-medium">{it.label}</span>
                    {it.value && <span className="text-xs text-muted-foreground">{it.value}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SheetSubHeading>About</SheetSubHeading>
            <div className="space-y-1 rounded-2xl border border-border/60 bg-card p-2">
              {[
                { label: "About StyleSync" },
                { label: "Terms" },
                { label: "Privacy Policy" },
              ].map((it) => (
                <button
                  key={it.label}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary"
                >
                  <Info className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
                  <span className="flex-1 text-left font-medium">{it.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
                </button>
              ))}
            </div>
          </div>

          <DemoNotice />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 6. Edit Profile Sheet                                                 */
/* ===================================================================== */

function EditProfileSheet() {
  const { activeSheet, closeSheet, user, updateUser } = useProfileStore();
  const open = activeSheet === "edit-profile";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile);
  const [city, setCity] = useState(user.city);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUser({ name: name.trim() || user.name, email: email.trim() || user.email, mobile: mobile.trim() || user.mobile, city: city.trim() || user.city });
    setSaved(true);
    setTimeout(() => { setSaved(false); goBack(); }, 800);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" suppressHydrationWarning />
            Edit profile
          </SheetTitle>
          <SheetDescription className="text-xs">Update your demo profile information.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div>
            <SheetSubHeading>Name</SheetSubHeading>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40" />
          </div>
          <div>
            <SheetSubHeading>Email</SheetSubHeading>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40" />
          </div>
          <div>
            <SheetSubHeading>Mobile</SheetSubHeading>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40" />
            <p className="mt-1 text-[10px] text-muted-foreground">Mobile is masked for demo. No real OTP is sent.</p>
          </div>
          <div>
            <SheetSubHeading>City</SheetSubHeading>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40">
              {DEMO_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={goBack}>Cancel</Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saved}>
              {saved ? (<><Check className="mr-1 h-4 w-4" suppressHydrationWarning /> Saved</>) : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 7. Service Preferences Sheet                                         */
/* ===================================================================== */

function ServicePreferencesSheet() {
  const { activeSheet, closeSheet, user, updateUser } = useProfileStore();
  const open = activeSheet === "service-preferences";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const toggleCategory = (cat: string) => {
    const list = user.preferredServices.includes(cat)
      ? user.preferredServices.filter((c) => c !== cat)
      : [...user.preferredServices, cat];
    updateUser({ preferredServices: list });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="h-5 w-5 text-primary" suppressHydrationWarning />
            Service preferences
          </SheetTitle>
          <SheetDescription className="text-xs">StyleSync AI uses these to prioritise recommendations for you.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <SheetSubHeading>Preferred services</SheetSubHeading>
          <div className="space-y-1 rounded-2xl border border-border/60 bg-card p-2">
            {SERVICE_CATEGORIES_FOR_PREFERENCES.map((cat) => {
              const checked = user.preferredServices.includes(cat);
              return (
                <label key={cat} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary">
                  <Checkbox checked={checked} onCheckedChange={() => toggleCategory(cat)} />
                  <span className="flex-1 font-medium">{cat}</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3 text-[10px] text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" suppressHydrationWarning />
            When you select categories, the AI Assistant will prioritise salons offering those services.
          </div>

          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={goBack}>
            <Check className="mr-1 h-4 w-4" suppressHydrationWarning /> Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 8. Notification Preferences Sheet                                     */
/* ===================================================================== */

function NotificationPreferencesSheet() {
  const { activeSheet, closeSheet, notificationSettings, setNotificationSetting } = useProfileStore();
  const open = activeSheet === "notification-preferences";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const entries = Object.entries(notificationSettings);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" suppressHydrationWarning />
            Notification preferences
          </SheetTitle>
          <SheetDescription className="text-xs">Choose which demo notifications you receive.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-2">
          <SheetSubHeading>Notification types</SheetSubHeading>
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
              <div>
                <div className="text-sm font-medium text-foreground">{key}</div>
                <div className="text-[11px] text-muted-foreground">{value ? "On" : "Off"}</div>
              </div>
              <Switch checked={value} onCheckedChange={(v) => setNotificationSetting(key, v)} />
            </div>
          ))}
          <DemoNotice text="Notification preferences are stored in your demo session only." />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 9. Help & Support Sheet                                               */
/* ===================================================================== */

function HelpSupportSheet() {
  const { activeSheet, closeSheet, openHelpTopic, openSheet, supportTickets, openSupportTicket } = useProfileStore();
  const open = activeSheet === "help-support";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());
  const [query, setQuery] = useState("");

  const filtered = HELP_TOPICS.filter((t) =>
    query ? `${t.question} ${t.category}`.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5 text-primary" suppressHydrationWarning />
            Help &amp; Support
          </SheetTitle>
          <SheetDescription className="text-xs">How can we help?</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" suppressHydrationWarning />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
            />
          </div>

          <div>
            <SheetSubHeading>Popular topics</SheetSubHeading>
            <div className="space-y-1 rounded-2xl border border-border/60 bg-card p-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openHelpTopic(t.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
                  <span className="flex-1 text-left font-medium">{t.question}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">No topics match &quot;{query}&quot;.</div>
              )}
            </div>
          </div>

          <div>
            <SheetSubHeading>Support tickets</SheetSubHeading>
            <div className="space-y-2">
              {supportTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openSupportTicket(t.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:bg-secondary"
                >
                  <div className={cn("grid h-9 w-9 place-items-center rounded-full", t.status === "Open" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")}>
                    <MessageSquare className="h-4 w-4" suppressHydrationWarning />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", t.status === "Open" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")}>{t.status}</span>
                    </div>
                    <div className="truncate text-sm font-medium text-foreground">{t.subject}</div>
                    <div className="text-[10px] text-muted-foreground">Created {t.created}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => openSheet("contact-support")}>
            <Send className="mr-2 h-4 w-4" suppressHydrationWarning /> Contact Support
          </Button>

          <DemoNotice text="Support tickets here are demo data. No real email or message is sent." />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 10. Help Topic Sheet                                                  */
/* ===================================================================== */

function HelpTopicSheet() {
  const { activeHelpTopicId, closeHelpTopic } = useProfileStore();
  const topic = HELP_TOPICS.find((t) => t.id === activeHelpTopicId);
  const open = !!topic;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeHelpTopic()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        {topic && (
          <>
            <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
              <SheetTitle className="text-lg leading-snug">{topic.question}</SheetTitle>
              <SheetDescription className="text-xs">{topic.category}</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <p className="text-sm leading-relaxed text-foreground/90">{topic.answer}</p>
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3 text-[10px] text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" suppressHydrationWarning />
                Need more help? Use Contact Support to submit a demo support ticket.
              </div>
              <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={closeHelpTopic}>
                Got it
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 11. Contact Support Sheet                                             */
/* ===================================================================== */

function ContactSupportSheet() {
  const { activeSheet, closeSheet, addSupportTicket, openSupportTicket } = useProfileStore();
  const open = activeSheet === "contact-support";
  const { goBack } = useSheetBrowserHistory(open, () => closeSheet());

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0]);
  const [message, setMessage] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;
    const id = addSupportTicket(subject.trim(), topic, message.trim(), bookingId.trim() || undefined);
    setSubmittedId(id);
    setSubject(""); setTopic(SUPPORT_TOPICS[0]); setMessage(""); setBookingId("");
  };

  const handleViewTicket = () => {
    if (submittedId) {
      openSupportTicket(submittedId);
      setSubmittedId(null);
      goBack();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" suppressHydrationWarning />
            Contact Support
          </SheetTitle>
          <SheetDescription className="text-xs">Submit a demo support request — no real email is sent.</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {submittedId ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-accent" suppressHydrationWarning />
              <div className="mt-2 text-base font-bold text-foreground">Your demo support request has been submitted.</div>
              <div className="mt-3 rounded-xl border border-border/60 bg-card p-3 text-left text-sm">
                <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Ticket ID</span><span className="font-mono font-semibold">{submittedId}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Status</span><span className="font-semibold text-accent">Open</span></div>
              </div>
              <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleViewTicket}>
                View Ticket
              </Button>
            </div>
          ) : (
            <>
              <div>
                <SheetSubHeading>Subject</SheetSubHeading>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40">
                  {SUPPORT_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <SheetSubHeading>Subject line</SheetSubHeading>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe your topic" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40" />
              </div>
              <div>
                <SheetSubHeading>Message</SheetSubHeading>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue" rows={4} className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40" />
              </div>
              <div>
                <SheetSubHeading>Booking ID (optional)</SheetSubHeading>
                <input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="DEMO-SS-1024" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={goBack}>Cancel</Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSubmit} disabled={!subject.trim() || !message.trim()}>
                  <Send className="mr-1 h-4 w-4" suppressHydrationWarning /> Submit Demo Request
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 12. Support Ticket Sheet                                              */
/* ===================================================================== */

function SupportTicketSheet() {
  const { activeSupportTicketId, closeSupportTicket, supportTickets } = useProfileStore();
  const ticket = supportTickets.find((t) => t.id === activeSupportTicketId);
  const open = !!ticket;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeSupportTicket()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        {ticket && (
          <>
            <SheetHeader className="border-b border-border/60 bg-secondary/40 p-4">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" suppressHydrationWarning />
                {ticket.id}
              </SheetTitle>
              <SheetDescription className="text-xs">{ticket.topic} · {ticket.created}</SheetDescription>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", ticket.status === "Open" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")}>{ticket.status}</span>
                <span className="text-xs text-muted-foreground">Created {ticket.created}</span>
              </div>

              <div>
                <SheetSubHeading>Subject</SheetSubHeading>
                <div className="rounded-xl border border-border/60 bg-card p-3 text-sm font-semibold text-foreground">{ticket.subject}</div>
              </div>

              <div>
                <SheetSubHeading>Your message</SheetSubHeading>
                <div className="whitespace-pre-wrap rounded-xl border border-border/60 bg-card p-3 text-sm text-foreground/90">{ticket.message}</div>
              </div>

              {ticket.replies.length > 0 && (
                <div>
                  <SheetSubHeading>Conversation</SheetSubHeading>
                  <div className="space-y-2">
                    {ticket.replies.map((r, i) => (
                      <div key={i} className={cn("flex", r.from === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-2xl p-3 text-xs", r.from === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                          <p>{r.text}</p>
                          <div className={cn("mt-1 text-[10px]", r.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>{r.at}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DemoNotice text="This is a prototype support ticket. No real agent will respond." />
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={closeSupportTicket}>Close</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ===================================================================== */
/* 13. Sign Out Confirmation Dialog                                      */
/* ===================================================================== */

function SignOutConfirmDialog() {
  const { activeSheet, closeSheet, signOut } = useProfileStore();
  const { logout: authLogout } = useAuthStore();
  const open = activeSheet === "sign-out";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && closeSheet()}>
      <AlertDialogContent className="teal-theme border-border bg-popover text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" suppressHydrationWarning />
            Sign out?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out of your StyleSync demo account?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              /* Clear both the profile-store sign-out flag AND the auth
                 session, so the next booking attempt will require auth. */
              authLogout();
              signOut();
            }}
          >
            Sign Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ===================================================================== */
/* 14. Signed-out full-screen view                                       */
/* ===================================================================== */

export function SignedOutView() {
  const { continueAsDemoUser } = useProfileStore();
  return (
    <div className="teal-theme flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
        <LogOut className="h-8 w-8" suppressHydrationWarning />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-foreground">You&apos;re signed out.</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This is a demo sign-out. Your demo data is preserved — continue any time.
      </p>
      <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90" onClick={continueAsDemoUser}>
        Continue as Demo User
      </Button>
      <p className="mt-4 text-[10px] text-muted-foreground">
        StyleSync is a prototype. Data shown here is DEMO DATA.
      </p>
    </div>
  );
}

/* ===================================================================== */
/* Helper exports for ProfileView                                        */
/* ===================================================================== */

export { DEMO_BOOKINGS, DEFAULT_SAVED_LOOKS };
