import { UserContextSchema, LanguageEnum, AccessibilityNeedEnum, DestinationIntentEnum, CrowdLevelEnum } from '../models/schemas';

describe('Schemas', () => {
  describe('LanguageEnum', () => {
    it('should accept valid languages', () => {
      expect(LanguageEnum.parse('en')).toBe('en');
      expect(LanguageEnum.parse('es')).toBe('es');
      expect(LanguageEnum.parse('fr')).toBe('fr');
    });

    it('should reject invalid languages', () => {
      expect(() => LanguageEnum.parse('de')).toThrow();
      expect(() => LanguageEnum.parse('')).toThrow();
    });
  });

  describe('AccessibilityNeedEnum', () => {
    it('should accept valid accessibility needs', () => {
      expect(AccessibilityNeedEnum.parse('wheelchair')).toBe('wheelchair');
      expect(AccessibilityNeedEnum.parse('visual')).toBe('visual');
      expect(AccessibilityNeedEnum.parse('hearing')).toBe('hearing');
      expect(AccessibilityNeedEnum.parse('none')).toBe('none');
    });

    it('should reject invalid needs', () => {
      expect(() => AccessibilityNeedEnum.parse('invalid')).toThrow();
    });
  });

  describe('DestinationIntentEnum', () => {
    it('should accept all valid intents', () => {
      const intents = ['restroom', 'gate', 'seat', 'exit', 'first_aid', 'concession', 'guest_services', 'water', 'sensory_room'];
      for (const intent of intents) {
        expect(DestinationIntentEnum.parse(intent)).toBe(intent);
      }
    });

    it('should reject invalid intents', () => {
      expect(() => DestinationIntentEnum.parse('invalid')).toThrow();
    });
  });

  describe('CrowdLevelEnum', () => {
    it('should accept valid crowd levels', () => {
      expect(CrowdLevelEnum.parse('low')).toBe('low');
      expect(CrowdLevelEnum.parse('medium')).toBe('medium');
      expect(CrowdLevelEnum.parse('high')).toBe('high');
    });
  });

  describe('UserContextSchema', () => {
    it('should accept valid context', () => {
      const ctx = UserContextSchema.parse({
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['none'],
        ticket_section: null,
        minutes_to_kickoff: 30,
        question: null,
      });
      expect(ctx.language).toBe('en');
      expect(ctx.current_location).toBe('gate_a');
    });

    it('should default language to en', () => {
      const ctx = UserContextSchema.parse({
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['none'],
        minutes_to_kickoff: 30,
      });
      expect(ctx.language).toBe('en');
    });

    it('should default accessibility_needs to none', () => {
      const ctx = UserContextSchema.parse({
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        minutes_to_kickoff: 30,
      });
      expect(ctx.accessibility_needs).toEqual(['none']);
    });

    it('should reject unknown zone ids', () => {
      expect(() =>
        UserContextSchema.parse({
          language: 'en',
          current_location: 'nonexistent_zone',
          destination_intent: 'restroom',
          accessibility_needs: ['none'],
          minutes_to_kickoff: 30,
        })
      ).toThrow();
    });

    it('should reject invalid minutes_to_kickoff', () => {
      expect(() =>
        UserContextSchema.parse({
          language: 'en',
          current_location: 'gate_a',
          destination_intent: 'restroom',
          accessibility_needs: ['none'],
          minutes_to_kickoff: 2000,
        })
      ).toThrow();
    });

    it('should sanitize question field', () => {
      const ctx = UserContextSchema.parse({
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['none'],
        minutes_to_kickoff: 30,
        question: 'Where is the restroom?',
      });
      expect(ctx.question).toBe('Where is the restroom?');
    });

    it('should normalize accessibility needs (remove none with real needs)', () => {
      const ctx = UserContextSchema.parse({
        language: 'en',
        current_location: 'gate_a',
        destination_intent: 'restroom',
        accessibility_needs: ['wheelchair', 'none'],
        minutes_to_kickoff: 30,
      });
      expect(ctx.accessibility_needs).toEqual(['wheelchair']);
    });
  });
});
