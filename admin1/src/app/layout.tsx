import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "StyleSync — Book trusted salons & beauty services near you",
  description:
    "StyleSync helps you discover nearby salons, compare services and prices, check real-time availability and book appointments in seconds.",
  keywords: [
    "StyleSync",
    "salon booking",
    "barber booking",
    "beauty services",
    "haircut",
    "makeup",
    "facial",
    "nail salon",
  ],
  authors: [{ name: "StyleSync" }],
  openGraph: {
    title: "StyleSync — Book trusted salons & beauty services near you",
    description:
      "Discover nearby salons, compare options, check real-time availability and book in seconds.",
    siteName: "StyleSync",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleSync",
    description: "Book trusted salons & beauty services near you.",
  },
};

export const viewport: Viewport = {
  themeColor: "#10232D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground overflow-x-hidden font-sans"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
