import { Stadium } from '../providers/stadium-data.provider';

const LEVELS = ['low', 'medium', 'high'] as const;
export type CrowdLevel = typeof LEVELS[number];

const LEVEL_INDEX: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function clamp(index: number): CrowdLevel {
  const maxIdx = LEVELS.length - 1;
  const clamped = Math.max(0, Math.min(maxIdx, index));
  return LEVELS[clamped] as CrowdLevel;
}

export function effectiveCrowd(
  stadium: Stadium,
  zoneId: string,
  minutesToKickoff: number | null
): CrowdLevel {
  const baseLevel = stadium.baseCrowd(zoneId);
  const baseIndex = LEVEL_INDEX[baseLevel] ?? 0;

  if (minutesToKickoff === null || minutesToKickoff === undefined) {
    return clamp(baseIndex);
  }

  const sim = stadium.crowd_sim;
  const surgeTypes = new Set<string>(sim.surge_zone_types || []);
  const zoneType = stadium.zoneType(zoneId);
  let bump = 0;

  if (surgeTypes.has(zoneType)) {
    const pre = parseInt(sim.pre_match_window_minutes ?? '30', 10);
    const imminent = parseInt(sim.imminent_window_minutes ?? '10', 10);

    if (minutesToKickoff >= 0 && minutesToKickoff <= imminent) {
      bump += 2;
    } else if (minutesToKickoff > imminent && minutesToKickoff <= pre) {
      bump += 1;
    }
  }

  if (minutesToKickoff < 0 && zoneType === 'gate' && sim.in_play_gate_relief) {
    bump -= 1;
  }

  return clamp(baseIndex + bump);
}
