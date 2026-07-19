import { UserContext, DecisionResult, RouteStep, FacilityInfo } from '../models/schemas';
import { Stadium, Facility, Edge, localized } from '../providers/stadium-data.provider';
import { findPath, pathDistance } from './routing.service';
import { effectiveCrowd } from './crowd.service';
import { stepInstruction, alternativesNote, urgencyNote } from './phrasing.service';

const INTENT_TO_TYPES: Record<string, Set<string>> = {
  restroom: new Set(['restroom', 'accessible_restroom']),
  first_aid: new Set(['first_aid']),
  concession: new Set(['concession']),
  guest_services: new Set(['guest_services']),
  water: new Set(['water']),
  sensory_room: new Set(['sensory_room']),
  exit: new Set(['exit']),
  gate: new Set(['gate']),
  // `seat` is resolved specially from ticket_section
};

const SWAP_ELIGIBLE = new Set([
  'restroom',
  'concession',
  'water',
  'guest_services',
  'sensory_room',
  'gate',
  'exit',
]);

const CROWD_INDEX: Record<string, number> = { low: 0, medium: 1, high: 2 };
const HURRY_INTENTS = new Set(['gate', 'seat']);

export class RouteNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteNotFoundError';
  }
}

function toFacilityInfo(facility: Facility, language: string): FacilityInfo {
  return {
    id: facility.id,
    name: localized(facility.names, language) || facility.id,
    type: facility.type,
    zone: facility.zone,
    accessible: facility.accessible,
    landmark: localized(facility.landmarks, language),
  };
}

function resolveSeat(ctx: UserContext, stadium: Stadium): Facility {
  const section = (ctx.ticket_section || '').trim();
  const isUpper = section.length > 0 && ['2', '3', '4'].includes(section[0]);
  const targetId = isUpper ? 'seat_upper' : 'seat_lower';

  for (const facility of stadium.facilities) {
    if (facility.id === targetId) {
      return facility;
    }
  }
  throw new RouteNotFoundError('seat facility fixture missing');
}

function candidatesWithRoutes(
  ctx: UserContext,
  stadium: Stadium,
  types: Set<string>,
  accessibleOnly: boolean,
  stepFree: boolean
): Array<{ facility: Facility; path: Edge[]; distance: number }> {
  const results: Array<{ facility: Facility; path: Edge[]; distance: number }> = [];

  for (const facility of stadium.facilitiesOfTypes(types, accessibleOnly)) {
    const path = findPath(stadium, ctx.current_location, facility.zone, stepFree);
    if (path === null) continue;
    results.push({ facility, path, distance: pathDistance(path) });
  }

  results.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.facility.id.localeCompare(b.facility.id);
  });

  return results;
}

function buildRouteSteps(
  stadium: Stadium,
  start: string,
  path: Edge[],
  facility: Facility,
  language: string
): RouteStep[] {
  const steps: RouteStep[] = [];
  const facilityName = localized(facility.names, language) || facility.id;
  let node = start;

  for (let i = 0; i < path.length; i++) {
    const edge = path[i];
    const isFinal = i === path.length - 1;
    const landmark = isFinal ? localized(facility.landmarks, language) : null;

    steps.push({
      order: i + 1,
      from_zone: node,
      to_zone: edge.to,
      means: edge.means,
      step_free: edge.step_free,
      distance: edge.distance,
      landmark,
      instruction: stepInstruction(
        edge.means,
        stadium.zoneName(edge.to, language),
        landmark,
        isFinal,
        facilityName,
        language
      ),
    });
    node = edge.to;
  }

  return steps;
}

function maybeSwapForCrowd(
  ctx: UserContext,
  stadium: Stadium,
  facility: Facility,
  path: Edge[],
  candidates: Array<{ facility: Facility; path: Edge[]; distance: number }>
): { facility: Facility; path: Edge[]; alternativesNote: string | null } {
  if (!SWAP_ELIGIBLE.has(ctx.destination_intent)) {
    return { facility, path, alternativesNote: null };
  }

  const primaryCrowd = effectiveCrowd(stadium, facility.zone, ctx.minutes_to_kickoff);
  if (primaryCrowd !== 'high') {
    return { facility, path, alternativesNote: null };
  }

  const alternatives: Array<{
    crowdRank: number;
    dist: number;
    id: string;
    fac: Facility;
    p: Edge[];
  }> = [];

  for (const { facility: cand, path: candPath, distance: candDist } of candidates) {
    if (cand.id === facility.id) continue;
    const candCrowd = effectiveCrowd(stadium, cand.zone, ctx.minutes_to_kickoff);
    if (candCrowd === 'high') continue;
    alternatives.push({
      crowdRank: CROWD_INDEX[candCrowd],
      dist: candDist,
      id: cand.id,
      fac: cand,
      p: candPath,
    });
  }

  if (alternatives.length === 0) {
    return { facility, path, alternativesNote: null };
  }

  alternatives.sort((a, b) => {
    if (a.crowdRank !== b.crowdRank) return a.crowdRank - b.crowdRank;
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.id.localeCompare(b.id);
  });

  const bestAlt = alternatives[0];
  const note = alternativesNote(bestAlt.fac.type, ctx.language);
  return { facility: bestAlt.fac, path: bestAlt.p, alternativesNote: note };
}

export function buildDecision(ctx: UserContext, stadium: Stadium): DecisionResult {
  const needs = new Set(ctx.accessibility_needs);
  const wheelchair = needs.has('wheelchair');
  const visual = needs.has('visual');
  const hearing = needs.has('hearing');

  const accessibleOnly = wheelchair || visual;
  const stepFree = wheelchair || visual;

  let mode: 'standard' | 'screen_reader' | 'captioned' = 'standard';
  if (visual) mode = 'screen_reader';
  else if (hearing) mode = 'captioned';

  let facility: Facility;
  let path: Edge[];
  let altNote: string | null = null;

  if (ctx.destination_intent === 'seat') {
    facility = resolveSeat(ctx, stadium);
    const p = findPath(stadium, ctx.current_location, facility.zone, stepFree);
    if (!p) throw new RouteNotFoundError('no accessible route to seat');
    path = p;
  } else {
    const types = INTENT_TO_TYPES[ctx.destination_intent];
    const candidates = candidatesWithRoutes(ctx, stadium, types, accessibleOnly, stepFree);
    if (candidates.length === 0) {
      throw new RouteNotFoundError(`no reachable facility for intent ${ctx.destination_intent}`);
    }
    const best = candidates[0];
    const swap = maybeSwapForCrowd(ctx, stadium, best.facility, best.path, candidates);
    facility = swap.facility;
    path = swap.path;
    altNote = swap.alternativesNote;
  }

  const crowdLevel = effectiveCrowd(stadium, facility.zone, ctx.minutes_to_kickoff);
  const hurry = ctx.minutes_to_kickoff < 15 && HURRY_INTENTS.has(ctx.destination_intent);
  const urgency = hurry ? urgencyNote(ctx.language) : null;
  const routeSteps = buildRouteSteps(stadium, ctx.current_location, path, facility, ctx.language);

  return {
    facility: toFacilityInfo(facility, ctx.language),
    route_steps: routeSteps,
    crowd_level: crowdLevel as any,
    language: ctx.language as any,
    accessibility_mode: mode as any,
    landmark_based: visual,
    hurry,
    alternatives_note: altNote,
    urgency,
  };
}
