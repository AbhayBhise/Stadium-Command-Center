'use client';

import { useState, useEffect } from 'react';
import { Utensils, Droplets, Clock, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { fetchBackend } from '@/lib/backend-api';

interface Facility {
  id: string;
  name: string;
  type: string;
  zone: string;
  accessible: boolean;
  crowdLevel: string;
  queueMins: number;
}

const TYPE_ICONS: Record<string, typeof Utensils> = {
  restroom: Droplets,
  accessible_restroom: Droplets,
  concession: Utensils,
  water: Droplets,
  first_aid: Utensils,
  guest_services: Utensils,
  sensory_room: Utensils,
};

const TYPE_COLORS: Record<string, string> = {
  restroom: 'text-sky-400',
  accessible_restroom: 'text-sky-400',
  concession: 'text-amber-400',
  water: 'text-blue-400',
  first_aid: 'text-red-400',
  guest_services: 'text-emerald-400',
  sensory_room: 'text-purple-400',
};

const CROWD_BADGE: Record<string, string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function FacilitiesWidget({ onNavigate }: { onNavigate?: (query: string) => void }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchFacilities = async () => {
      try {
        const res = await fetchBackend('/api/facilities');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (mounted) {
          setFacilities(data.facilities?.slice(0, 6) || []);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    fetchFacilities();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mt-4 w-full flex items-center justify-center p-8">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
        <span className="ml-2 text-sm text-zinc-500">Loading facilities...</span>
      </div>
    );
  }

  if (error || facilities.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {facilities.map((fac) => {
        const Icon = TYPE_ICONS[fac.type] || Utensils;
        const color = TYPE_COLORS[fac.type] || 'text-zinc-400';
        return (
          <div key={fac.id} className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 flex flex-col gap-3 hover:bg-zinc-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-zinc-900 ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">{fac.name}</h4>
                  <span className="text-xs text-zinc-400 capitalize">{fac.type.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${CROWD_BADGE[fac.crowdLevel] || 'bg-zinc-800 text-zinc-400'}`}>
                {fac.crowdLevel}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-zinc-300">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-zinc-500" />
                {fac.zone.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-zinc-500" />
                ~{fac.queueMins} min wait
              </div>
            </div>
            
            <button
              onClick={() => onNavigate?.(`Find ${fac.type.replace(/_/g, ' ')}`)}
              className="mt-2 w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              Navigate Here
            </button>
          </div>
        );
      })}
    </div>
  );
}
