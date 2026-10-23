'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]" suppressHydrationWarning>
      <div className="flex items-center gap-2.5 text-sm text-[#0F766E] font-medium" suppressHydrationWarning>
        <LoadingSpinner size="md" />
        Redirecting to StyleSync Super Admin...
      </div>
    </div>
  );
}
