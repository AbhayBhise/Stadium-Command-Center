import fs from 'fs';
import path from 'path';

export type I18n = {
  en?: string;
  es?: string;
  fr?: string;
  [key: string]: string | undefined;
};

export const DEFAULT_LANG = 'en';

export function localized(mapping: I18n | undefined | null, language: string): string | null {
  if (!mapping) return null;
  return mapping[language] || mapping[DEFAULT_LANG] || Object.values(mapping)[0] || null;
}

export interface Zone {
  id: string;
  names: I18n;
  type: string;
  level: string;
}

export interface Edge {
  to: string;
  means: string;
  step_free: boolean;
  distance: number;
}

export interface Facility {
  id: string;
  names: I18n;
  type: string;
  zone: string;
  accessible: boolean;
  landmarks?: I18n;
}

export class Stadium {
  name: string;
  fifa_name: string;
  city: string;
  capacity: number;
  zones: Record<string, Zone>;
  adjacency: Record<string, Edge[]>;
  facilities: Facility[];
  crowd_base: Record<string, string>;
  crowd_sim: Record<string, any>;

  constructor(
    name: string,
    fifa_name: string,
    city: string,
    capacity: number,
    zones: Record<string, Zone>,
    adjacency: Record<string, Edge[]>,
    facilities: Facility[],
    crowd_base: Record<string, string>,
    crowd_sim: Record<string, any>
  ) {
    this.name = name;
    this.fifa_name = fifa_name;
    this.city = city;
    this.capacity = capacity;
    this.zones = zones;
    this.adjacency = adjacency;
    this.facilities = facilities;
    this.crowd_base = crowd_base;
    this.crowd_sim = crowd_sim;
  }

  zoneIds(): Set<string> {
    return new Set(Object.keys(this.zones));
  }

  zoneName(zoneId: string, language: string = DEFAULT_LANG): string {
    const zone = this.zones[zoneId];
    return zone ? localized(zone.names, language) || zoneId : zoneId;
  }

  zoneType(zoneId: string): string {
    return this.zones[zoneId]?.type || '';
  }

  neighbors(zoneId: string): Edge[] {
    return this.adjacency[zoneId] || [];
  }

  facilitiesOfTypes(types: Set<string>, accessibleOnly: boolean = false): Facility[] {
    return this.facilities.filter(
      (f) => types.has(f.type) && (!accessibleOnly || f.accessible)
    );
  }

  baseCrowd(zoneId: string): string {
    return this.crowd_base[zoneId] || 'low';
  }
}

let _stadiumInstance: Stadium | null = null;

function readJson(filename: string): any {
  const filePath = path.join(__dirname, '..', 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function buildStadium(): Stadium {
  const stadiumRaw = readJson('stadium.json');
  const facilitiesRaw = readJson('facilities.json');
  const crowdRaw = readJson('crowd.json');

  const zones: Record<string, Zone> = {};
  for (const z of stadiumRaw.zones) {
    zones[z.id] = { id: z.id, names: z.name, type: z.type, level: z.level };
  }

  const adjacency: Record<string, Edge[]> = {};
  for (const zid of Object.keys(zones)) {
    adjacency[zid] = [];
  }
  for (const e of stadiumRaw.edges) {
    adjacency[e.from].push({ to: e.to, means: e.means, step_free: e.step_free, distance: e.distance });
    adjacency[e.to].push({ to: e.from, means: e.means, step_free: e.step_free, distance: e.distance });
  }

  const facilities: Facility[] = facilitiesRaw.facilities.map((f: any) => ({
    id: f.id,
    names: f.name,
    type: f.type,
    zone: f.zone,
    accessible: f.accessible,
    landmarks: f.landmark,
  }));

  const meta = stadiumRaw.stadium;
  return new Stadium(
    meta.name,
    meta.fifa_name,
    meta.city,
    meta.capacity,
    zones,
    adjacency,
    facilities,
    crowdRaw.base || {},
    crowdRaw.simulation || {}
  );
}

export function getStadium(): Stadium {
  if (!_stadiumInstance) {
    _stadiumInstance = buildStadium();
  }
  return _stadiumInstance;
}
