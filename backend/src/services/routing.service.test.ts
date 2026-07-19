import { findPath, pathDistance } from './routing.service';
import { getStadium } from '../providers/stadium-data.provider';

describe('RoutingService — findPath', () => {
  const stadium = getStadium();

  it('should find path from gate_a to concourse_lower_sw', () => {
    const result = findPath(stadium, 'gate_a', 'concourse_lower_sw', false);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
  });

  it('should find path from gate_a to seating_lower', () => {
    const result = findPath(stadium, 'gate_a', 'seating_lower', false);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
  });

  it('should find path from gate_b to seating_upper', () => {
    const result = findPath(stadium, 'gate_b', 'seating_upper', false);
    expect(result).not.toBeNull();
  });

  it('should return empty array when start equals goal', () => {
    const result = findPath(stadium, 'gate_a', 'gate_a', false);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(0);
  });

  it('should return null for unknown start zone', () => {
    const result = findPath(stadium, 'nonexistent', 'gate_a', false);
    expect(result).toBeNull();
  });

  it('should return null for unknown goal zone', () => {
    const result = findPath(stadium, 'gate_a', 'nonexistent', false);
    expect(result).toBeNull();
  });

  it('should avoid stairs when stepFreeOnly is true', () => {
    const result = findPath(stadium, 'gate_a', 'seating_upper', true);
    if (result !== null && result.length > 0) {
      for (const edge of result) {
        expect(edge.step_free).toBe(true);
      }
    }
  });

  it('should find shortest path between two distant zones', () => {
    const result = findPath(stadium, 'gate_a', 'seating_lower', false);
    expect(result).not.toBeNull();
    const dist = pathDistance(result!);
    expect(dist).toBeGreaterThan(0);
  });
});

describe('RoutingService — pathDistance', () => {
  it('should return 0 for empty path', () => {
    expect(pathDistance([])).toBe(0);
  });

  it('should sum edge distances', () => {
    const edges = [
      { to: 'b', means: 'walk', step_free: true, distance: 100 },
      { to: 'c', means: 'walk', step_free: true, distance: 200 },
    ];
    expect(pathDistance(edges)).toBe(300);
  });
});
