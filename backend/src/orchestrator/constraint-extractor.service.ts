// ─────────────────────────────────────────────────────────────────────────────
// Stage 1.5: Constraint Extractor
// Extracts natural language constraints from the user query BEFORE the LLM.
// These constraints inform planning and are validated by the Decision Engine.
// This is the key differentiator vs rigid enum-only competitors.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedConstraints {
  // Avoidance
  avoidGates: string[]; // e.g. ['Gate 6', 'Gate 3']
  avoidAreas: string[]; // e.g. ['concourse B', 'lower level']
  avoidStairs: boolean;
  avoidCrowds: boolean;

  // Preferences
  preferAccessible: boolean;
  preferQuiet: boolean;
  preferShaded: boolean;
  preferFamilyFriendly: boolean;
  preferShortestQueue: boolean;
  preferNearest: boolean;
  preferVegetarian: boolean;
  preferVegan: boolean;

  // Waypoints / chaining
  viaLocations: string[]; // e.g. ['merchandise store', 'ATM']
  meetFriend?: string; // e.g. 'Gate B'

  // Temporal constraints
  beforeKickoff: boolean;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';

  // Medical / special
  diabetic: boolean;
  withChildren: boolean;
  withElderly: boolean;
  requiresWheelchair: boolean;

  // Raw summary for Gemini planning stage
  summary: string;
}

// Pattern matchers
const GATE_PATTERN = /(?:gate|entrance)\s+([A-Z0-9]{1,3})/gi;
const AREA_PATTERN =
  /(?:avoid|skip|not via|stay away from)\s+(?:the\s+)?([a-zA-Z0-9 ]+?)(?:\s+(?:area|section|zone|level)|,|$)/gi;

export class ConstraintExtractorService {
  extract(query: string, conversationHistory?: string): ExtractedConstraints {
    const q = query.toLowerCase();
    const fullContext = `${conversationHistory ?? ''} ${q}`.toLowerCase();

    // Extract gates to avoid
    const avoidGates: string[] = [];
    const avoidMatch = query.match(
      /(?:avoid|skip|not (?:via|through)|stay away from)\s+gate\s+([A-Z0-9]{1,3})/gi
    );
    if (avoidMatch) {
      avoidMatch.forEach((m) => {
        const g = m.match(GATE_PATTERN);
        if (g) avoidGates.push(...g.map((x) => x.trim()));
      });
    }

    // Extract general areas to avoid
    const avoidAreas: string[] = [];
    let areaMatch;
    const areaRegex = new RegExp(AREA_PATTERN.source, 'gi');
    while ((areaMatch = areaRegex.exec(query)) !== null) {
      avoidAreas.push(areaMatch[1].trim());
    }

    // Via / waypoints
    const viaLocations: string[] = [];
    const viaMatch = query.match(
      /(?:via|through|stop(?:ping)? at|after visiting|past)\s+(?:the\s+)?([a-zA-Z ]+?)(?:\s+(?:store|shop|court|desk)|,|$)/gi
    );
    if (viaMatch) {
      viaMatch.forEach((m) => {
        const cleaned = m
          .replace(/^(?:via|through|stopping at|after visiting|past)\s+(?:the\s+)?/i, '')
          .trim();
        viaLocations.push(cleaned);
      });
    }

    // Meet friend location
    const meetMatch = query.match(
      /(?:meet(?:ing)?|find|join)\s+(?:my\s+)?friend(?:s?)\s+(?:at|near|by)\s+(?:gate\s+)?([A-Za-z0-9 ]+)/i
    );
    const meetFriend = meetMatch ? meetMatch[1].trim() : undefined;

    const constraints: ExtractedConstraints = {
      avoidGates,
      avoidAreas,
      avoidStairs: /avoid\s+stairs|no\s+stairs|without\s+stairs|step.free/i.test(query),
      avoidCrowds: /avoid\s+crowd|less\s+crowd|not\s+crowded|avoid\s+busy/i.test(query),
      preferAccessible: /wheelchair|accessible|disability|mobility|ramp|elevator/i.test(
        fullContext
      ),
      preferQuiet: /quiet|peaceful|less noisy|noise/i.test(q),
      preferShaded: /shade|shaded|covered|indoors|out of sun/i.test(q),
      preferFamilyFriendly: /family|children|kids|with\s+my\s+kid/i.test(q),
      preferShortestQueue:
        /shortest queue|least queue|no queue|less wait|fast(?:est)?\s+(?:food|service|line)/i.test(
          q
        ),
      preferNearest: /nearest|closest|closest|closest/i.test(q),
      preferVegetarian: /vegetarian|veggie/i.test(fullContext),
      preferVegan: /vegan/i.test(fullContext),
      viaLocations,
      meetFriend,
      beforeKickoff: /before\s+(?:the\s+)?(?:kickoff|match|game|concert|show|event|start)/i.test(q),
      urgency: this.detectUrgency(q),
      diabetic: /diabet(?:ic|es)|diabetic|blood sugar|insulin/i.test(fullContext),
      withChildren: /with\s+(?:my\s+)?(?:children|kids|baby|toddler)|family with kids/i.test(
        fullContext
      ),
      withElderly:
        /with\s+(?:my\s+)?(?:elderly|grandparent|senior|aged|old(?:er)?)\s+(?:parent|relative|friend)?/i.test(
          fullContext
        ),
      requiresWheelchair: /wheelchair|can(?:not|'t)\s+walk|mobility\s+(?:aid|device)/i.test(
        fullContext
      ),
      summary: '',
    };

    constraints.summary = this.buildSummary(constraints);
    return constraints;
  }

  private detectUrgency(q: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (/urgent|emergency|immediately|right now|hurry|asap|quick(?:ly)?/i.test(q)) return 'HIGH';
    if (/soon|before kickoff|late|running out of time/i.test(q)) return 'MEDIUM';
    return 'LOW';
  }

  private buildSummary(c: ExtractedConstraints): string {
    const parts: string[] = [];
    if (c.avoidGates.length > 0) parts.push(`Avoid gates: ${c.avoidGates.join(', ')}`);
    if (c.avoidAreas.length > 0) parts.push(`Avoid areas: ${c.avoidAreas.join(', ')}`);
    if (c.avoidStairs) parts.push('Step-free route required');
    if (c.avoidCrowds) parts.push('Avoid crowded areas');
    if (c.preferAccessible) parts.push('Accessible route preferred');
    if (c.preferQuiet) parts.push('Quiet area preferred');
    if (c.preferShortestQueue) parts.push('Shortest queue preferred');
    if (c.preferVegetarian) parts.push('Vegetarian options required');
    if (c.preferVegan) parts.push('Vegan options required');
    if (c.viaLocations.length > 0) parts.push(`Waypoints: ${c.viaLocations.join(' → ')}`);
    if (c.meetFriend) parts.push(`Meeting friend at: ${c.meetFriend}`);
    if (c.diabetic)
      parts.push('User is diabetic — prioritize low-sugar food options near medical facilities');
    if (c.withChildren) parts.push('Travelling with children — family-friendly routes');
    if (c.withElderly)
      parts.push('Travelling with elderly — minimize walking distance, avoid stairs');
    if (c.requiresWheelchair) parts.push('Requires wheelchair — step-free routes only');
    if (c.beforeKickoff) parts.push('Must complete before kickoff');
    if (c.urgency === 'HIGH') parts.push('URGENT request');
    return parts.length > 0 ? parts.join('; ') : 'No specific constraints detected';
  }
}

export const constraintExtractor = new ConstraintExtractorService();
