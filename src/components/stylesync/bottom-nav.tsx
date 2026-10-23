"use client";

import { Home, Compass, Wand2, CalendarCheck, User } from "lucide-react";
import { useAppStore, type AppView } from "@/lib/salon-store";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { id: AppView; label: string; icon: React.ComponentType<{ className?: string; suppressHydrationWarning?: boolean }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "ai", label: "AI", icon: Wand2 },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const { view, setView } = useAppStore();

  return (
    <nav
      className="teal-theme fixed inset-x-0 bottom-0 z-40 border-t border-border/60 backdrop-blur-xl lg:hidden ss-bottom-nav-bg"
      aria-label="Primary"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      suppressHydrationWarning
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full transition-all",
                  active && "bg-secondary"
                )}
              >
                <Icon className="h-4.5 w-4.5" suppressHydrationWarning />
              </span>
              <span>{item.label}</span>
              {active && (
                <span className="absolute -top-px h-0.5 w-8 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
