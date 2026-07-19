'use client';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { NavigationTarget } from '@/app/page';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-zinc-800/50 rounded-xl flex items-center justify-center border border-zinc-700/50">
      <Loader2 className="animate-spin text-zinc-500" size={32} />
    </div>
  ),
});

export function NavigationWidget({ onClose, target }: { onClose?: () => void; target?: NavigationTarget | null }) {
  return (
    <div className="w-full h-full flex flex-col flex-1">
      <MapInner onClose={onClose} target={target} />
    </div>
  );
}
