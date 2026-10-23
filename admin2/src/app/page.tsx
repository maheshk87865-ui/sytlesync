'use client';
import dynamic from 'next/dynamic';
import { useSalonStore } from '@/lib/store';
import { Toasts } from '@/components/salon/Toasts';

const SalonAppShell = dynamic(
  () => import('@/components/salon/SalonAppShell').then(mod => mod.SalonAppShell),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <SalonAppShell />
      <Toasts />
    </>
  );
}
