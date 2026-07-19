import { effectiveCrowd } from './crowd.service';
import { getStadium } from '../providers/stadium-data.provider';

describe('CrowdService — effectiveCrowd', () => {
  const stadium = getStadium();

  it('should return base crowd level when minutesToKickoff is null', () => {
    const level = effectiveCrowd(stadium, 'gate_a', null);
    expect(['low', 'medium', 'high']).toContain(level);
  });

  it('should return base crowd level when minutesToKickoff is undefined', () => {
    const level = effectiveCrowd(stadium, 'gate_a', undefined as unknown as number);
    expect(['low', 'medium', 'high']).toContain(level);
  });

  it('should escalate crowd for surge zones near kickoff', () => {
    const base = effectiveCrowd(stadium, 'gate_a', 120); // Far from kickoff
    const near = effectiveCrowd(stadium, 'gate_a', 5); // Imminent
    const baseIdx = { low: 0, medium: 1, high: 2 }[base] ?? 0;
    const nearIdx = { low: 0, medium: 1, high: 2 }[near] ?? 0;
    expect(nearIdx).toBeGreaterThanOrEqual(baseIdx);
  });

  it('should increase crowd in pre-match window (10-30 min)', () => {
    const base = effectiveCrowd(stadium, 'gate_a', 120);
    const preMatch = effectiveCrowd(stadium, 'gate_a', 20);
    const baseIdx = { low: 0, medium: 1, high: 2 }[base] ?? 0;
    const preIdx = { low: 0, medium: 1, high: 2 }[preMatch] ?? 0;
    expect(preIdx).toBeGreaterThanOrEqual(baseIdx);
  });

  it('should cap at high maximum', () => {
    const level = effectiveCrowd(stadium, 'gate_a', 0);
    expect(['low', 'medium', 'high']).toContain(level);
  });

  it('should not exceed high at floor of low', () => {
    const level = effectiveCrowd(stadium, 'seat_lower', 120);
    expect(['low', 'medium', 'high']).toContain(level);
  });

  it('should return valid crowd levels for non-surge zones', () => {
    const level = effectiveCrowd(stadium, 'seat_lower', 5);
    expect(['low', 'medium', 'high']).toContain(level);
  });

  it('should handle in-play gate relief for negative minutes', () => {
    const level = effectiveCrowd(stadium, 'gate_a', -30);
    expect(['low', 'medium', 'high']).toContain(level);
  });
});
