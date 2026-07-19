import { eventProvider } from './event.provider';
import { getStadium, localized } from './stadium-data.provider';
import { effectiveCrowd } from '../services/crowd.service';

const STADIUM_GPS: Record<string, { lat: number; lng: number }> = {
  gate_a: { lat: 40.8135, lng: -74.0745 },
  gate_b: { lat: 40.8138, lng: -74.0730 },
  gate_c: { lat: 40.8128, lng: -74.0720 },
  gate_d: { lat: 40.8132, lng: -74.0755 },
  concourse_a: { lat: 40.8133, lng: -74.0740 },
  concourse_b: { lat: 40.8136, lng: -74.0735 },
  concourse_c: { lat: 40.8130, lng: -74.0725 },
  concourse_d: { lat: 40.8129, lng: -74.0750 },
  concourse_e: { lat: 40.8134, lng: -74.0760 },
  concourse_f: { lat: 40.8137, lng: -74.0715 },
  seat_lower: { lat: 40.8131, lng: -74.0738 },
  seat_upper: { lat: 40.8131, lng: -74.0738 },
};

export class GPSProvider {
  async getCurrentLocation(_userId: string) {
    const stadium = getStadium();
    const zoneIds = Object.keys(stadium.zones);
    const randomZone = zoneIds[Math.floor(Math.random() * zoneIds.length)];
    const gps = STADIUM_GPS[randomZone] || { lat: 40.8135, lng: -74.0740 };
    const isOffline = Math.random() > 0.9;
    return Promise.resolve({
      lat: gps.lat,
      lng: gps.lng,
      zone: randomZone,
      description: `${stadium.zoneName(randomZone, 'en')} (auto-detected)`,
      available: !isOffline,
      freshnessMs: isOffline ? 45000 : 1200,
    });
  }
}

export class TicketProvider {
  async getTicket(_userId: string) {
    const eventContext = await eventProvider.getEventContext();
    return Promise.resolve({
      event: eventContext.event,
      match: eventContext.match,
      day: 'Saturday',
      time: eventContext.kickoff,
      section: 'B2',
      row: '18',
      seat: '41',
      gate: 'Gate 6',
      parking: 'Parking P3',
      orderId: 'WMB-2938-XYZ',
      holder: 'Abhay Singh',
      type: 'VIP',
      hasTicket: true,
    });
  }
}

export class CrowdProvider {
  async getCrowdDensity(location: string) {
    const stadium = getStadium();
    const eventContext = await eventProvider.getEventContext();
    const minutesToKickoff = parseInt(eventContext.currentMinute.replace('T-', ''), 10) || 30;

    const zoneId = this.findZoneByKeyword(stadium, location);
    const crowdLevel = zoneId ? effectiveCrowd(stadium, zoneId, minutesToKickoff) : 'medium';

    const waitMap: Record<string, number> = { low: 2, medium: 8, high: 15 };
    const trendMap: Record<string, string> = {
      low: 'Decreasing',
      medium: 'Stable',
      high: 'Growing rapidly',
    };

    return Promise.resolve({
      level: crowdLevel.charAt(0).toUpperCase() + crowdLevel.slice(1),
      waitTimeMinutes: waitMap[crowdLevel] || 8,
      fresh: true,
      trend: trendMap[crowdLevel] || 'Stable',
      predictedWait15Mins: (waitMap[crowdLevel] || 8) + 5,
      predictedWait30Mins: (waitMap[crowdLevel] || 8) + 10,
      zone: zoneId || location,
      basedOn: zoneId ? 'stadium simulation model' : 'estimated',
    });
  }

  private findZoneByKeyword(stadium: ReturnType<typeof getStadium>, keyword: string): string | null {
    const lower = keyword.toLowerCase();
    for (const [zoneId, zone] of Object.entries(stadium.zones)) {
      const names = Object.values(zone.names || {}).map(n => (n || '').toLowerCase());
      if (names.some(n => lower.includes(n)) || zoneId.toLowerCase().includes(lower)) {
        return zoneId;
      }
    }
    return null;
  }
}

export class FacilityProvider {
  async getNearestFacility(type: string, _location: unknown) {
    const stadium = getStadium();
    const eventContext = await eventProvider.getEventContext();
    const minutesToKickoff = parseInt(eventContext.currentMinute.replace('T-', ''), 10) || 30;

    const typeMap: Record<string, string[]> = {
      WASHROOM: ['restroom', 'accessible_restroom'],
      FOOD: ['concession'],
      HELP_DESK: ['guest_services'],
      WATER: ['water'],
      MEDICAL: ['first_aid'],
      SENSORY: ['sensory_room'],
      EXIT: ['exit'],
      GATE: ['gate'],
    };

    const facilityTypes = new Set(typeMap[type] || [type.toLowerCase()]);
    const facilities = stadium.facilities.filter(f => facilityTypes.has(f.type));

    return Promise.resolve(
      facilities.slice(0, 3).map(f => {
        const name = localized(f.names, 'en') || f.id;
        const crowd = effectiveCrowd(stadium, f.zone, minutesToKickoff);
        const queueMap: Record<string, number> = { low: 2, medium: 8, high: 18 };
        const occupantMap: Record<string, number> = { low: 15, medium: 55, high: 90 };
        return {
          name,
          zone: f.zone,
          type: f.type,
          distanceMeters: Math.floor(Math.random() * 80) + 20,
          accessible: f.accessible,
          queueMins: queueMap[crowd] || 5,
          occupants: occupantMap[crowd] || 50,
          status: crowd === 'high' ? 'Busy' : crowd === 'medium' ? 'Moderate' : 'Available',
          walkTimeMins: Math.floor(Math.random() * 4) + 1,
          open: true,
          queueTrend: crowd === 'high' ? 'Growing rapidly' : crowd === 'medium' ? 'Stable' : 'Decreasing',
          crowdLevel: crowd,
        };
      })
    );
  }
}

export class StaffProvider {
  async getStaffDirectory() {
    return Promise.resolve({
      guestServices: {
        name: 'Guest Services',
        officer: 'Duty Officer',
        level: 'Level 1',
        status: 'Available',
        etaMins: 1,
        phone: '+1-201-555-0100',
      },
      medicalDesk: {
        name: 'Medical Desk',
        officer: 'Medical Team',
        phone: '+1-201-555-0101',
      },
    });
  }
}

export class EmergencyProvider {
  async getEmergencyContacts() {
    return Promise.resolve({
      security: {
        team: 'Security Team',
        officer: 'Control Room',
        phone: '+1-201-555-0112',
        etaSecs: 90,
      },
      medical: {
        unit: 'Medical Unit',
        doctor: 'On-duty Medical Staff',
        etaSecs: 60,
        nearestAedMeters: 35,
        phone: '+1-201-555-0101',
      },
    });
  }
}

export class WeatherProvider {
  async getWeather() {
    const now = new Date();
    const hour = now.getHours();
    const isEvening = hour >= 17 || hour < 6;
    const tempC = isEvening ? 18 : 24;
    const conditions = ['Clear', 'Partly Cloudy', 'Light Breeze', 'Overcast'];
    const condition = conditions[now.getMinutes() % conditions.length];

    return Promise.resolve({
      tempC,
      condition,
      rainExpected: false,
      updated: true,
      forecast30Mins: condition === 'Overcast' ? 'Possible light rain' : 'Stable conditions',
      lastUpdatedMinsAgo: 1,
      humidity: 55 + (now.getMinutes() % 20),
      windSpeed: 8 + (now.getMinutes() % 10),
    });
  }
}

export class ParkingProvider {
  async getParkingStatus() {
    const fillBase = 60 + Math.floor(Math.random() * 25);
    const fillNext = Math.min(fillBase + 12, 100);

    return Promise.resolve({
      zone: 'Parking P3',
      car: 'MH14XX1234',
      status: 'Remembered',
      walkingTimeMins: 5 + Math.floor(Math.random() * 3),
      traffic: fillBase > 80 ? 'Heavy' : fillBase > 60 ? 'Moderate' : 'Low',
      fillPercentage: fillBase,
      predictedFill30Mins: fillNext,
      trend: fillNext > 90 ? 'Filling fast' : 'Stable',
      availableSpots: Math.max(0, Math.floor((100 - fillBase) * 12)),
    });
  }
}

export const providers = {
  gps: new GPSProvider(),
  ticket: new TicketProvider(),
  crowd: new CrowdProvider(),
  facility: new FacilityProvider(),
  staff: new StaffProvider(),
  emergency: new EmergencyProvider(),
  weather: new WeatherProvider(),
  parking: new ParkingProvider(),
  event: eventProvider,
};
