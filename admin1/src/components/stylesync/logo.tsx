import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  /** Use white text for dark backgrounds (header / hero / dark cards). */
  variant?: "default" | "light";
}

export function StyleSyncLogo({ className, showText = true, size = "md", variant = "default" }: LogoProps) {
  const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative grid place-items-center rounded-xl ss-brand-gradient", dims)}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-1/2 w-1/2 text-white"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          suppressHydrationWarning
        >
          <path d="M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M6 9l6 6" />
          <path d="M18 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
          <path d="M18 9l-6 6" />
          <path d="M12 15l-1.5 4" />
          <path d="M12 15l1.5 4" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold tracking-tight",
              text,
              isLight ? "text-white" : "ss-brand-name"
            )}
            suppressHydrationWarning
          >
            Style
            <span className={isLight ? "text-emerald-300" : "ss-brand-text-gradient"}>Sync</span>
          </span>
          <span
            className={cn(
              "text-[9px] font-medium uppercase tracking-[0.15em]",
              isLight ? "text-white/70" : "text-muted-foreground"
            )}
          >
            Salons & Beauty
          </span>
        </div>
      )}
    </div>
  );
}
