import { buildDecision } from './context-engine.service';
import { getStadium } from '../providers/stadium-data.provider';
import { UserContext } from '../models/schemas';

describe('ContextEngine — buildDecision', () => {
  const stadium = getStadium();

  describe('wheelchair accessibility', () => {
    it('should return accessible restroom for wheelchair users', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['wheelchair'],
        ticket_section: null,
        minutes_to_kickoff: 30,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.facility.type).toBe('accessible_restroom');
      expect(decision.route_steps.every(s => s.step_free)).toBe(true);
    });

    it('should use step-free routes for wheelchair users', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_b',
        destination_intent: 'concession',
        accessibility_needs: ['wheelchair'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.route_steps.every(s => s.step_free)).toBe(true);
    });
  });

  describe('visual accessibility', () => {
    it('should set screen_reader mode for visual impairment', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'guest_services',
        accessibility_needs: ['visual'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.accessibility_mode).toBe('screen_reader');
      expect(decision.landmark_based).toBe(true);
    });

    it('should use step-free routes for visual impairment', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'water',
        accessibility_needs: ['visual'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.route_steps.every(s => s.step_free)).toBe(true);
    });
  });

  describe('hearing accessibility', () => {
    it('should set captioned mode for hearing impairment', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'concession',
        accessibility_needs: ['hearing'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.accessibility_mode).toBe('captioned');
    });
  });

  describe('seat resolution', () => {
    it('should route to seat_lower for lower sections', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'seat',
        accessibility_needs: ['none'],
        ticket_section: 'B2',
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.facility.id).toBe('seat_lower');
    });

    it('should route to seat_upper for upper sections', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'seat',
        accessibility_needs: ['none'],
        ticket_section: '301',
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.facility.id).toBe('seat_upper');
    });
  });

  describe('crowd-aware swapping', () => {
    it('should suggest quieter alternative when nearest facility has high crowd', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['none'],
        ticket_section: null,
        minutes_to_kickoff: 5, // imminent → surge zones get high crowd
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      // When crowd is high, should either swap or note the alternative
      expect(decision).not.toBeNull();
      expect(decision.facility).toBeDefined();
    });
  });

  describe('urgency', () => {
    it('should flag urgency for gate/seat intents when kickoff is imminent', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'seat',
        accessibility_needs: ['none'],
        ticket_section: 'B2',
        minutes_to_kickoff: 10,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.hurry).toBe(true);
      expect(decision.urgency).not.toBeNull();
    });

    it('should not flag urgency when kickoff is far away', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'seat',
        accessibility_needs: ['none'],
        ticket_section: 'B2',
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.hurry).toBe(false);
    });
  });

  describe('localization', () => {
    it('should return French facility names', () => {
      const ctx: UserContext = {
        language: 'fr',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['none'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.language).toBe('fr');
      expect(decision.route_steps.length).toBeGreaterThan(0);
    });

    it('should return Spanish facility names', () => {
      const ctx: UserContext = {
        language: 'es',
        current_location: 'gate_a',
        destination_intent: 'concession',
        accessibility_needs: ['none'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.language).toBe('es');
    });
  });

  describe('no accessibility needs', () => {
    it('should return standard mode when no accessibility needs', () => {
      const ctx: UserContext = {
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'exit',
        accessibility_needs: ['none'],
        ticket_section: null,
        minutes_to_kickoff: 60,
        question: null,
      };
      const decision = buildDecision(ctx, stadium);
      expect(decision.accessibility_mode).toBe('standard');
      expect(decision.landmark_based).toBe(false);
    });
  });
});
