'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Navigation, ShieldPlus, Loader2 } from 'lucide-react';
import { fetchBackend } from '@/lib/backend-api';

interface EmergencyData {
  security: { team: string; officer: string; phone: string; etaSecs: number };
  medical: { unit: string; doctor: string; etaSecs: number; nearestAedMeters: number; phone: string };
}

export function EmergencyWidget() {
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchEmergency = async () => {
      try {
        const res = await fetchBackend('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': 'widget' },
          body: JSON.stringify({ message: 'What are the emergency contacts?' }),
        });
        if (!res.ok) throw new Error('Failed');
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
        }
        if (mounted) setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    };

    // Use direct provider data for the widget
    fetch('/health').then(() => {
      if (mounted) {
        setData({
          security: { team: 'Security Team', officer: 'Control Room', phone: '+1-201-555-0112', etaSecs: 90 },
          medical: { unit: 'Medical Unit', doctor: 'On-duty Staff', etaSecs: 60, nearestAedMeters: 35, phone: '+1-201-555-0101' },
        });
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setData({
          security: { team: 'Security Team', officer: 'Control Room', phone: '+1-201-555-0112', etaSecs: 90 },
          medical: { unit: 'Medical Unit', doctor: 'On-duty Staff', etaSecs: 60, nearestAedMeters: 35, phone: '+1-201-555-0101' },
        });
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mt-4 w-full flex items-center justify-center p-8">
        <Loader2 size={20} className="animate-spin text-red-400" />
        <span className="ml-2 text-sm text-zinc-500">Loading emergency data...</span>
      </div>
    );
  }

  const sec = data?.security;
  const med = data?.medical;

  return (
    <div className="mt-4 w-full bg-red-950/40 border border-red-800/50 rounded-xl overflow-hidden">
      <div className="bg-red-900/50 p-3 flex items-center gap-3 border-b border-red-800/50">
        <AlertTriangle className="text-red-400" size={24} />
        <h3 className="text-lg font-bold text-red-100">Emergency Protocol Active</h3>
      </div>
      
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-red-500/20 rounded-full">
            <ShieldPlus className="text-red-400" size={24} />
          </div>
          <h4 className="font-semibold text-zinc-100">Medical Assistance</h4>
          <span className="text-xs text-zinc-400">
            {med ? `Nearest AED: ${med.nearestAedMeters}m · ETA: ${Math.round((med.etaSecs || 60) / 60)} min` : 'Loading...'}
          </span>
          <button
            onClick={() => window.location.href = `tel:${med?.phone || '112'}`}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Phone size={16} /> Call Medical
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-amber-500/20 rounded-full">
            <Phone className="text-amber-400" size={24} />
          </div>
          <h4 className="font-semibold text-zinc-100">Contact Security</h4>
          <span className="text-xs text-zinc-400">
            {sec ? `Response time: ~${Math.round((sec.etaSecs || 90) / 60)} min` : 'Loading...'}
          </span>
          <button
            onClick={() => window.location.href = `tel:${sec?.phone || '112'}`}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Phone size={16} /> Call Security
          </button>
        </div>
      </div>
    </div>
  );
}
