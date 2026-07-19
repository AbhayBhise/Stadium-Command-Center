import { renderAnswer, stepInstruction, alternativesNote, urgencyNote, typeLabel, PhrasingContext } from './phrasing.service';

describe('PhrasingService', () => {
  describe('stepInstruction', () => {
    it('should generate final step instruction in English', () => {
      const result = stepInstruction('walk', 'Concourse A', 'near Gate 1', true, 'Restroom C4', 'en');
      expect(result).toContain('Walk');
      expect(result).toContain('Concourse A');
      expect(result).toContain('Restroom C4');
    });

    it('should generate mid-step instruction in English', () => {
      const result = stepInstruction('ramp', 'Concourse B', null, false, 'Restroom', 'en');
      expect(result).toContain('ramp');
      expect(result).toContain('Concourse B');
    });

    it('should generate French instructions', () => {
      const result = stepInstruction('walk', 'Concourse A', null, true, 'Toilettes', 'fr');
      expect(result).toContain('Marchez');
    });

    it('should generate Spanish instructions', () => {
      const result = stepInstruction('elevator', 'Concourse C', null, false, 'Aseo', 'es');
      expect(result).toContain('ascensor');
    });

    it('should fallback to walk for unknown means', () => {
      const result = stepInstruction('fly', 'Concourse D', null, false, 'Place', 'en');
      expect(result).toContain('Walk');
    });
  });

  describe('alternativesNote', () => {
    it('should generate English alternative note', () => {
      const note = alternativesNote('restroom', 'en');
      expect(note).toContain('restroom');
    });

    it('should generate French alternative note', () => {
      const note = alternativesNote('concession', 'fr');
      expect(note).toContain('proposée');
    });
  });

  describe('urgencyNote', () => {
    it('should generate English urgency', () => {
      const note = urgencyNote('en');
      expect(note).toContain('Kickoff');
    });

    it('should generate Spanish urgency', () => {
      const note = urgencyNote('es');
      expect(note).toContain('partido');
    });

    it('should generate French urgency', () => {
      const note = urgencyNote('fr');
      expect(note).toContain('Coup');
    });
  });

  describe('typeLabel', () => {
    it('should return English labels', () => {
      expect(typeLabel('restroom', 'en')).toBe('restroom');
      expect(typeLabel('concession', 'en')).toBe('concession');
      expect(typeLabel('first_aid', 'en')).toBe('first aid station');
    });

    it('should return French labels', () => {
      expect(typeLabel('restroom', 'fr')).toBe('toilettes');
      expect(typeLabel('concession', 'fr')).toBe('point de restauration');
    });

    it('should return Spanish labels', () => {
      expect(typeLabel('restroom', 'es')).toBe('aseo');
    });
  });

  describe('renderAnswer', () => {
    const baseCtx: PhrasingContext = {
      language: 'en',
      facilityName: 'Restroom C4',
      facilityType: 'restroom',
      facilityLandmark: 'near Gate 1',
      crowdLevel: 'medium',
      accessibilityMode: 'standard',
      landmarkBased: false,
      hurry: false,
      alternativeType: null,
      totalDistance: 120,
      stepCount: 3,
    };

    it('should render a complete English answer', () => {
      const answer = renderAnswer(baseCtx);
      expect(answer).toContain('Restroom C4');
      expect(answer).toContain('3');
      expect(answer).toContain('120');
      expect(answer).toContain('moderate');
    });

    it('should render French answer', () => {
      const ctx = { ...baseCtx, language: 'fr' };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('Restroom C4');
    });

    it('should render Spanish answer', () => {
      const ctx = { ...baseCtx, language: 'es' };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('Restroom C4');
    });

    it('should include urgency note when hurry is true', () => {
      const ctx = { ...baseCtx, hurry: true };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('Kickoff');
    });

    it('should include alternative note when alternativeType is set', () => {
      const ctx = { ...baseCtx, alternativeType: 'restroom' };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('restroom');
    });

    it('should include landmark note when landmarkBased is true', () => {
      const ctx = { ...baseCtx, landmarkBased: true };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('landmarks');
    });

    it('should include captioned note for hearing accessibility', () => {
      const ctx = { ...baseCtx, accessibilityMode: 'captioned' };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('signage');
    });

    it('should show "already at location" for zero-step route', () => {
      const ctx = { ...baseCtx, stepCount: 0 };
      const answer = renderAnswer(ctx);
      expect(answer).toContain('already');
    });
  });
});
