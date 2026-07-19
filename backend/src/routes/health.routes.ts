import { Router, Request, Response } from 'express';
import { getStadium, localized } from '../providers/stadium-data.provider';
import { effectiveCrowd } from '../services/crowd.service';
import { env } from '../config/env';
import { providers } from '../providers/context.providers';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const hasGemini = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0);
    let geminiStatus = hasGemini ? 'configured' : 'not configured (deterministic mode)';

    if (hasGemini) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`);
        geminiStatus = geminiRes.ok ? 'connected' : 'disconnected';
      } catch {
        geminiStatus = 'unreachable';
      }
    }

    res.status(200).json({
      status: 'ok',
      service: 'Stadium Command Center',
      version: '1.0.0',
      database: env.DATABASE_URL ? 'connected' : 'offline (fixture mode)',
      gemini: geminiStatus,
      mode: hasGemini ? 'ai-enhanced' : 'deterministic',
    });
  } catch {
    res.status(200).json({
      status: 'ok',
      service: 'Stadium Command Center',
      version: '1.0.0',
      mode: 'deterministic',
    });
  }
});

/**
 * GET /api/stadium
 * Returns zone/facility metadata + enum vocabularies for the frontend.
 * Mirrors the competitor's /api/stadium endpoint.
 */
router.get('/stadium', (_req: Request, res: Response) => {
  try {
    const stadium = getStadium();
    const zones = Object.entries(stadium.zones).map(([id, zone]) => ({
      id,
      name: zone.names,
      type: zone.type,
      level: zone.level,
    }));

    const facilities = stadium.facilities.map(f => ({
      id: f.id,
      name: f.names,
      type: f.type,
      zone: f.zone,
      accessible: f.accessible,
      landmark: f.landmarks,
    }));

    const crowdBase = stadium.crowd_base;

    res.json({
      stadium: {
        name: stadium.name,
        fifa_name: stadium.fifa_name,
        city: stadium.city,
        capacity: stadium.capacity,
      },
      zones,
      facilities,
      crowd_base: crowdBase,
      enums: {
        languages: ['en', 'es', 'fr'],
        accessibility_needs: ['wheelchair', 'visual', 'hearing', 'none'],
        destination_intents: [
          'restroom', 'gate', 'seat', 'exit', 'first_aid',
          'concession', 'guest_services', 'water', 'sensory_room',
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stadium data' });
  }
});

/**
 * GET /api/crowd
 * Returns crowd levels for all zones (or a specific zone).
 */
router.get('/crowd', async (req: Request, res: Response) => {
  try {
    const stadium = getStadium();
    const eventContext = await providers.event.getEventContext();
    const minutesToKickoff = parseInt(eventContext.currentMinute.replace('T-', ''), 10) || 30;
    const requestedZone = req.query.zone as string | undefined;

    if (requestedZone) {
      const level = effectiveCrowd(stadium, requestedZone, minutesToKickoff);
      res.json({ zone: requestedZone, level, minutesToKickoff });
      return;
    }

    const crowdData = Object.keys(stadium.zones).map(zoneId => ({
      zone: zoneId,
      name: localized(stadium.zones[zoneId].names, 'en') || zoneId,
      type: stadium.zones[zoneId].type,
      level: effectiveCrowd(stadium, zoneId, minutesToKickoff),
      baseCrowd: stadium.baseCrowd(zoneId),
    }));

    res.json({ zones: crowdData, minutesToKickoff, event: eventContext.event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute crowd data' });
  }
});

/**
 * GET /api/facilities
 * Returns facilities with real-time crowd data.
 */
router.get('/facilities', async (_req: Request, res: Response) => {
  try {
    const stadium = getStadium();
    const eventContext = await providers.event.getEventContext();
    const minutesToKickoff = parseInt(eventContext.currentMinute.replace('T-', ''), 10) || 30;

    const facilities = stadium.facilities.map(f => {
      const crowd = effectiveCrowd(stadium, f.zone, minutesToKickoff);
      const queueMap: Record<string, number> = { low: 2, medium: 8, high: 18 };
      return {
        id: f.id,
        name: localized(f.names, 'en') || f.id,
        type: f.type,
        zone: f.zone,
        accessible: f.accessible,
        crowdLevel: crowd,
        queueMins: queueMap[crowd] || 5,
      };
    });

    res.json({ facilities, event: eventContext.event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load facilities' });
  }
});

export default router;
