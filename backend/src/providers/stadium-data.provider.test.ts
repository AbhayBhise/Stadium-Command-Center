import { getStadium, localized } from './stadium-data.provider';

describe('StadiumDataProvider', () => {
  const stadium = getStadium();

  describe('stadium metadata', () => {
    it('should load stadium name', () => {
      expect(stadium.name).toBeTruthy();
    });

    it('should load stadium capacity', () => {
      expect(stadium.capacity).toBeGreaterThan(0);
    });

    it('should load zones', () => {
      expect(Object.keys(stadium.zones).length).toBeGreaterThan(0);
    });

    it('should load facilities', () => {
      expect(stadium.facilities.length).toBeGreaterThan(0);
    });

    it('should load adjacency graph', () => {
      expect(Object.keys(stadium.adjacency).length).toBeGreaterThan(0);
    });
  });

  describe('zone helpers', () => {
    it('should return zone IDs as Set', () => {
      const ids = stadium.zoneIds();
      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBeGreaterThan(0);
    });

    it('should return zone name', () => {
      const name = stadium.zoneName('gate_a', 'en');
      expect(name).toBeTruthy();
    });

    it('should return zone type', () => {
      const type = stadium.zoneType('gate_a');
      expect(type).toBeTruthy();
    });

    it('should return neighbors for a zone', () => {
      const neighbors = stadium.neighbors('gate_a');
      expect(neighbors.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown zone', () => {
      const neighbors = stadium.neighbors('nonexistent');
      expect(neighbors).toEqual([]);
    });

    it('should return base crowd level', () => {
      const crowd = stadium.baseCrowd('gate_a');
      expect(['low', 'medium', 'high']).toContain(crowd);
    });
  });

  describe('facility helpers', () => {
    it('should filter facilities by type', () => {
      const restrooms = stadium.facilitiesOfTypes(new Set(['restroom']));
      expect(restrooms.length).toBeGreaterThan(0);
      expect(restrooms.every(f => f.type === 'restroom')).toBe(true);
    });

    it('should filter accessible facilities', () => {
      const accessible = stadium.facilitiesOfTypes(new Set(['restroom', 'accessible_restroom']), true);
      expect(accessible.every(f => f.accessible)).toBe(true);
    });
  });

  describe('localized()', () => {
    it('should return English name', () => {
      const names = { en: 'Hello', es: 'Hola', fr: 'Bonjour' };
      expect(localized(names, 'en')).toBe('Hello');
    });

    it('should fallback to English', () => {
      const names = { en: 'Hello' };
      expect(localized(names, 'de')).toBe('Hello');
    });

    it('should return null for null input', () => {
      expect(localized(null, 'en')).toBeNull();
    });

    it('should return first value as last resort', () => {
      const names = { de: 'Hallo' };
      expect(localized(names, 'en')).toBe('Hallo');
    });
  });
});
