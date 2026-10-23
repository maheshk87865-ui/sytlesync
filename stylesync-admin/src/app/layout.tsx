import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'StyleSync Super Admin — Salon & Beauty Service Operations',
  description: 'Administrative platform for StyleSync salon and beauty-service marketplace in Srinagar, Jammu & Kashmir.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F8FAF9] text-[#17201F] antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
