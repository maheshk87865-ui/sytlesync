"use client";

import { Bell, MapPin, Search, Heart, User } from "lucide-react";
import { useAppStore } from "@/lib/salon-store";
import { useAuthStore } from "@/lib/auth-store";
import { StyleSyncLogo } from "./logo";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const LOCATIONS = ["Srinagar", "Jammu", "Delhi", "Mumbai", "Bengaluru", "Chandigarh"];

export function SiteHeader() {
  const { location, setLocation, setView, view } = useAppStore();
  const { isAuthenticated, currentUser, openAuth } = useAuthStore();
  const [search, setSearch] = useState("");
  const [locOpen, setLocOpen] = useState(false);

  const navItems: { id: "home" | "discover" | "ai" | "bookings" | "profile"; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "discover", label: "Discover" },
    { id: "ai", label: "AI Assistant" },
    { id: "bookings", label: "Bookings" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-[rgba(250,248,243,0.92)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(250,248,243,0.85)] text-foreground">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => setView("home")}
          className="shrink-0 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="StyleSync home"
        >
          <StyleSyncLogo variant="default" />
        </button>

        {/* Location selector */}
        <Popover open={locOpen} onOpenChange={setLocOpen}>
          <PopoverTrigger asChild>
            <button className="hidden shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-secondary/60 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary/40 hover:bg-secondary md:flex">
              <MapPin className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
              <span className="max-w-[7rem] truncate">{location}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="start">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select city
            </div>
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setLocation(loc);
                  setLocOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent/30"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                  {loc}
                </span>
                {loc === location && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" suppressHydrationWarning />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => view !== "discover" && setView("discover")}
            placeholder="Search salons, services or treatments"
            className="h-10 rounded-full border-border bg-white pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:ring-primary/20"
          />
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full text-foreground hover:bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" suppressHydrationWarning />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden h-10 w-10 rounded-full text-foreground hover:bg-secondary sm:inline-flex"
            aria-label="Saved salons"
            onClick={() => setView("profile")}
          >
            <Heart className="h-4.5 w-4.5" suppressHydrationWarning />
          </Button>

          <button
            onClick={() => {
              /* If unauthenticated, open the auth modal (profile-required
                 mode) instead of navigating to the Profile page. */
              if (isAuthenticated) setView("profile");
              else openAuth("profile-required");
            }}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full ss-brand-gradient text-xs font-bold text-white ring-2 ring-white hover:opacity-90 transition"
            aria-label={isAuthenticated ? "Open profile" : "Sign in"}
            suppressHydrationWarning
          >
            {isAuthenticated && currentUser ? currentUser.avatarInitial : "S"}
          </button>
        </div>
      </div>

      {/* Desktop top nav (lg+) */}
      <nav className="hidden border-t border-border/40 bg-[rgba(255,255,255,0.55)] lg:block">
        <div className="mx-auto flex h-11 w-full max-w-7xl items-center gap-1 px-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`relative px-3 py-2 text-sm font-medium transition ${
                view === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {view === item.id && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-secondary/60 px-2 py-1 font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> DEMO DATA
            </span>
            <span className="hidden xl:inline">Not real businesses · for prototype only</span>
          </div>
        </div>
      </nav>
    </header>
  );
}
