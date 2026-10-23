#!/usr/bin/env python3
"""
Add suppressHydrationWarning to every lucide-react icon usage in the
stylesync components directory.

Lucide icons accept arbitrary SVG props via {...rest} spread, so passing
`suppressHydrationWarning` propagates to the underlying <svg> element.
This silences the DarkReader-induced hydration mismatch warnings without
requiring us to replace every icon with a wrapper component.

Handles:
  - Self-closing tags:  <Search className="..." />     -> <Search ... suppressHydrationWarning />
  - Tags with content:  <Search className="...">...</> -> <Search ... suppressHydrationWarning>...</>
  - Multi-line tags
  - Skips tags that already have suppressHydrationWarning
"""
import re
import pathlib

ROOT = pathlib.Path("/home/z/my-project/src/components/stylesync")

# Pattern: <IconName ...attributes... /> or <IconName ...attributes...>
# We match from <IconName up to the next /> or > (whichever comes first).
# IconName must start with an uppercase letter (lucide convention).
TAG_RE = re.compile(
    r'(<([A-Z][A-Za-z0-9]+)(?:(?!\bsuppressHydrationWarning\b)[^>])*?)(\s*/?>)',
    re.DOTALL,
)

# Files to skip (not lucide icons - our own components)
SKIP_TYPES = {"StyleSyncLogo", "Icon", "Skeleton", "Avatar", "AvatarFallback", "Button",
              "Sheet", "SheetContent", "SheetHeader", "SheetTitle", "SheetDescription",
              "Badge", "Input", "Popover", "PopoverContent", "PopoverTrigger",
              "EmptyState", "SalonCard", "SalonCarousel", "AiAssistantCard",
              "ServiceCategories", "PopularServices", "SiteHeader", "BottomNav",
              "CompareBar", "SalonProfileSheet", "BookingSheet", "HomeView",
              "DiscoverView", "AiView", "BookingsView", "ProfileView",
              "StyleSync", "Image"}

stats = {"scanned": 0, "modified": 0, "added": 0, "skipped_already": 0}

for path in ROOT.rglob("*.tsx"):
    stats["scanned"] += 1
    original = path.read_text()
    new_text = original
    file_changes = 0

    def repl(m):
        global file_changes
        opening = m.group(1)
        tag_name = m.group(2)
        closer = m.group(3)
        # Skip our own component types (not lucide icons)
        if tag_name in SKIP_TYPES:
            return m.group(0)
        # Skip if already has it
        if "suppressHydrationWarning" in opening:
            stats["skipped_already"] += 1
            return m.group(0)
        # Add the prop just before the closer
        stats["added"] += 1
        return f'{opening} suppressHydrationWarning{closer}'

    new_text = TAG_RE.sub(repl, original)
    if new_text != original:
        path.write_text(new_text)
        stats["modified"] += 1
        print(f"  updated: {path.relative_to(ROOT)}")

print("\nStats:")
for k, v in stats.items():
    print(f"  {k}: {v}")
