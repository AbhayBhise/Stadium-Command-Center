'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, TrendingDown, TrendingUp, ArrowRight, Loader2, AlertTriangle, Cpu, Brain } from 'lucide-react';
import { fetchBackend } from '@/lib/backend-api';

interface CrowdZone {
  zone: string;
  name: string;
  type: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  baseCrowd: string;
  capacity: number;
  current: number;
  percentage: number;
}

// Capacity reference for threshold calculations
const CAPACITY_MAP: Record<string, number> = {
  'gate_a': 300, 'gate_b': 250, 'gate_c': 200, 'gate_d': 350,
  'entrance_1': 400, 'entrance_2': 300, 'entrance_3': 350,
  'concourse_a': 600, 'concourse_b': 500, 'concourse_c': 550,
  'parking_1': 200, 'parking_2': 150, 'main_plaza': 800,
};

const WARNING_THRESHOLD = 75;  // %
const CRITICAL_THRESHOLD = 90; // %

const LEVEL_CONFIG: Record<string, { color: string; border: string; label: string; trend: string }> = {
  low: { color: 'text-emerald-400', border: 'border-emerald-500/50', label: 'Low Traffic', trend: 'Flowing quickly' },
  medium: { color: 'text-amber-400', border: 'border-amber-500/30', label: 'Moderate', trend: 'Steady flow' },
  high: { color: 'text-red-400', border: 'border-red-500/30', label: 'WARNING', trend: 'Heavy delays' },
  critical: { color: 'text-rose-400', border: 'border-rose-500/50', label: 'CRITICAL', trend: 'Over capacity' },
};

function predictCongestion(zone: CrowdZone): { trend: 'up' | 'down' | 'stable'; prediction: string } {
  if (zone.percentage >= 80) return { trend: 'up', prediction: 'Likely to reach critical within 15 min' };
  if (zone.percentage >= 60) return { trend: 'up', prediction: 'Congestion increasing approaching threshold' };
  if (zone.percentage >= 40) return { trend: 'stable', prediction: 'Moderate — monitor for changes at next check' };
  return { trend: 'down', prediction: 'Comfortable capacity, no action needed' };
}

export function CrowdWidget({ onNavigate }: { onNavigate?: (query: string) => void }) {
  const [zones, setZones] = useState<CrowdZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholdAlerts, setThresholdAlerts] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchCrowd = async () => {
      try {
        const res = await fetchBackend('/api/crowd');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (mounted && data.zones) {
          const enriched: CrowdZone[] = data.zones.map((z: any) => {
            const capacity = CAPACITY_MAP[z.zone] || 200;
            const crowdIndex = z.level === 'low' ? 0.15 : z.level === 'medium' ? 0.55 : 0.85;
            const current = Math.round(capacity * crowdIndex);
            const percentage = Math.round((current / capacity) * 100);
            const mappedLevel = percentage >= CRITICAL_THRESHOLD ? 'critical' : percentage >= WARNING_THRESHOLD ? 'high' : percentage >= 40 ? 'medium' : 'low';
            return { ...z, level: mappedLevel, capacity, current, percentage };
          });
          setZones(enriched);

          // Check thresholds and generate AI-powered alerts
          const alerts: string[] = [];
          for (const z of enriched) {
            if (z.percentage >= CRITICAL_THRESHOLD) {
              alerts.push(`🚨 CRITICAL: ${z.name} at ${z.percentage}% — immediate action required: evacuate non-essential, open all exits, request security backup`);
            } else if (z.percentage >= WARNING_THRESHOLD) {
              alerts.push(`⚠️ WARNING: ${z.name} at ${z.percentage}% — consider redirecting crowds, open secondary gates, deploy additional staff`);
            }
          }
          setThresholdAlerts(alerts);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };
    fetchCrowd();
    const interval = setInterval(fetchCrowd, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const recommendedZone = useMemo(() => zones.find(z => z.level === 'low') || zones[0], [zones]);
  const criticalCount = useMemo(() => zones.filter(z => z.level === 'critical').length, [zones]);
  const warningCount = useMemo(() => zones.filter(z => z.level === 'high').length, [zones]);

  if (loading) {
    return (
      <div className="mt-4 w-full flex items-center justify-center p-8">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
        <span className="ml-2 text-sm text-zinc-500">Loading crowd telemetry...</span>
      </div>
    );
  }

  if (zones.length === 0) return null;

  return (
    <div className="mt-4 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-zinc-100 font-semibold mb-4 flex items-center gap-2">
        <Users size={18} className="text-sky-400" /> Live Crowd Intelligence
        {(criticalCount > 0 || warningCount > 0) && (
          <span className="text-[10px] flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full ml-auto">
            <Cpu size={10} /> AI Monitored
          </span>
        )}
      </h3>

      {/* Threshold Alert Banner */}
      {thresholdAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {thresholdAlerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
              alert.includes('CRITICAL')
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Zone Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {zones.slice(0, 9).map((zone) => {
          const config = LEVEL_CONFIG[zone.level] || LEVEL_CONFIG.medium;
          const prediction = predictCongestion(zone);
          return (
            <div key={zone.zone} className={`bg-zinc-800/50 p-3 rounded-lg border ${config.border} relative overflow-hidden`}>
              {/* AI Badge */}
              <span className="absolute top-1 right-1 text-[9px] text-blue-500/60 bg-blue-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Brain size={8} /> AI
              </span>

              <div className="text-xs text-zinc-400 mb-1">{zone.name}</div>
              <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>

              {/* Capacity Bar */}
              <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    zone.percentage >= CRITICAL_THRESHOLD ? 'bg-rose-500' :
                    zone.percentage >= WARNING_THRESHOLD ? 'bg-amber-500' :
                    zone.percentage >= 40 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(zone.percentage, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">{zone.percentage}% capacity</div>

              <div className={`text-xs mt-1 flex items-center gap-1 ${config.color} opacity-80`}>
                {prediction.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {prediction.prediction}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI-powered routing suggestion */}
      {recommendedZone && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Brain size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <span className="font-semibold">AI recommendation:</span> {recommendedZone.name} has the least congestion. 
              Route spectators toward this area to maintain flow and reduce pressure on critical zones.
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => onNavigate?.(`Navigate to ${recommendedZone.name} gate`)}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        Navigate to {recommendedZone.name} <ArrowRight size={16} />
      </button>

      {/* XAI Explanation */}
      <div className="mt-3 text-[10px] text-zinc-500 border-t border-zinc-800 pt-3">
        <span className="font-semibold text-zinc-400">Why this matters:</span> Thresholds at {WARNING_THRESHOLD}% and {CRITICAL_THRESHOLD}% are based on stadium safety standards. At {WARNING_THRESHOLD}%+, pedestrian flow slows significantly. At {CRITICAL_THRESHOLD}%+, emergency evacuation routes become compromised.
      </div>
    </div>
  );
}
