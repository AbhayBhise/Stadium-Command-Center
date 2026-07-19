'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { fetchBackend } from '@/lib/backend-api';

interface PlanStep {
  time: string;
  event: string;
  location: string;
}

export function PlanningWidget() {
  const [schedule, setSchedule] = useState<PlanStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const buildPlan = async () => {
      try {
        const res = await fetchBackend('/api/crowd');
        if (!res.ok) throw new Error('Failed');
        const crowdData = await res.json();
        
        const now = new Date();
        const kickoff = new Date(now);
        kickoff.setHours(19, 30, 0, 0);
        const minutesUntilKickoff = Math.max(0, Math.floor((kickoff.getTime() - now.getTime()) / 60000));

        const gates = (crowdData.zones || []).filter((z: { type: string }) => z.type === 'gate');
        const leastCrowded = gates.sort((a: { level: string }, b: { level: string }) => {
          const order: Record<string, number> = { low: 0, medium: 1, high: 2 };
          return (order[a.level] || 0) - (order[b.level] || 0);
        })[0];

        const plan: PlanStep[] = [
          { time: formatTime(now, 0), event: 'Arrive at Stadium', location: leastCrowded?.name || 'Gate' },
          { time: formatTime(now, 5), event: 'Check Crowd & Find Gate', location: `Use ${leastCrowded?.name || 'recommended gate'} (${leastCrowded?.level || 'low'} crowd)` },
          { time: formatTime(now, 10), event: 'Grab Food & Drinks', location: 'Nearest concession' },
        ];
        
        if (minutesUntilKickoff > 15) {
          plan.push({ time: formatTime(now, minutesUntilKickoff - 15), event: 'Head to Seat', location: 'Section B2, Row 18' });
        }
        plan.push({ time: formatTime(now, minutesUntilKickoff), event: 'Match Kickoff', location: 'Section B2, Row 18, Seat 41' });
        plan.push({ time: formatTime(now, minutesUntilKickoff + 45), event: 'Half-time Break', location: 'Nearest restroom' });
        plan.push({ time: formatTime(now, minutesUntilKickoff + 90), event: 'Match Ends', location: 'Exit via recommended route' });

        if (mounted) {
          setSchedule(plan);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setSchedule([
            { time: '19:30', event: 'Match Kickoff', location: 'Section B2, Row 18' },
            { time: '20:15', event: 'Half-time Break', location: 'Nearest restroom' },
            { time: '21:00', event: 'Match Ends', location: 'Exit via recommended route' },
          ]);
          setLoading(false);
        }
      }
    };
    buildPlan();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mt-4 w-full flex items-center justify-center p-8">
        <Loader2 size={20} className="animate-spin text-indigo-400" />
        <span className="ml-2 text-sm text-zinc-500">Building your plan...</span>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-zinc-100 font-semibold mb-4 flex items-center gap-2">
        <Calendar size={18} className="text-indigo-400" /> AI-Generated Schedule
      </h3>
      
      <div className="relative pl-6 space-y-6 before:absolute before:inset-y-1 before:left-2.5 before:w-px before:bg-zinc-700">
        {schedule.map((item, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[29px] top-1 w-3 h-3 bg-zinc-900 border-2 border-indigo-500 rounded-full z-10" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <div className="flex items-center gap-1 text-sm font-medium text-indigo-300 w-16 shrink-0">
                <Clock size={14} /> {item.time}
              </div>
              <div>
                <div className="text-sm text-zinc-200">{item.event}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} /> {item.location}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(base: Date, offsetMinutes: number): string {
  const d = new Date(base.getTime() + offsetMinutes * 60000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
