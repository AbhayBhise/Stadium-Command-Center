import { z } from 'zod';
import { getStadium } from '../providers/stadium-data.provider';

export const LanguageEnum = z.enum(['en', 'es', 'fr']);
export type Language = z.infer<typeof LanguageEnum>;

export const AccessibilityNeedEnum = z.enum(['wheelchair', 'visual', 'hearing', 'none']);
export type AccessibilityNeed = z.infer<typeof AccessibilityNeedEnum>;

export const DestinationIntentEnum = z.enum([
  'restroom',
  'gate',
  'seat',
  'exit',
  'first_aid',
  'concession',
  'guest_services',
  'water',
  'sensory_room',
]);
export type DestinationIntent = z.infer<typeof DestinationIntentEnum>;

export const CrowdLevelEnum = z.enum(['low', 'medium', 'high']);
export type CrowdLevel = z.infer<typeof CrowdLevelEnum>;

export const AccessibilityModeEnum = z.enum(['standard', 'screen_reader', 'captioned']);
export type AccessibilityMode = z.infer<typeof AccessibilityModeEnum>;

export const UserContextSchema = z.object({
  language: LanguageEnum.default('en'),
  current_location: z.string().min(1).max(40).refine(val => getStadium().zoneIds().has(val), {
    message: "Unknown zone id",
  }),
  destination_intent: DestinationIntentEnum,
  accessibility_needs: z.array(AccessibilityNeedEnum).default(['none']).transform(needs => {
    const unique = Array.from(new Set(needs));
    if (unique.includes('none') && unique.length > 1) {
      return unique.filter(n => n !== 'none').sort();
    }
    if (unique.length === 0) return ['none'];
    return unique.sort();
  }),
  ticket_section: z.string().max(8).regex(/^[A-Za-z0-9\- ]*$/).nullable().default(null),
  minutes_to_kickoff: z.number().min(-120).max(1440),
  question: z.string().max(280).nullable().default(null),
});

export type UserContext = z.infer<typeof UserContextSchema>;

export const RouteStepSchema = z.object({
  order: z.number(),
  from_zone: z.string(),
  to_zone: z.string(),
  means: z.string(),
  step_free: z.boolean(),
  distance: z.number(),
  landmark: z.string().nullable().default(null),
  instruction: z.string(),
});
export type RouteStep = z.infer<typeof RouteStepSchema>;

export const FacilityInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  zone: z.string(),
  accessible: z.boolean(),
  landmark: z.string().nullable().default(null),
});
export type FacilityInfo = z.infer<typeof FacilityInfoSchema>;

export const DecisionResultSchema = z.object({
  facility: FacilityInfoSchema,
  route_steps: z.array(RouteStepSchema),
  crowd_level: CrowdLevelEnum,
  language: LanguageEnum,
  accessibility_mode: AccessibilityModeEnum,
  landmark_based: z.boolean().default(false),
  hurry: z.boolean().default(false),
  alternatives_note: z.string().nullable().default(null),
  urgency: z.string().nullable().default(null),
});
export type DecisionResult = z.infer<typeof DecisionResultSchema>;

export const AssistResponseSchema = z.object({
  answer: z.string(),
  route_steps: z.array(RouteStepSchema),
  facility: FacilityInfoSchema,
  crowd_level: CrowdLevelEnum,
  language: LanguageEnum,
  accessibility_mode: AccessibilityModeEnum,
  alternatives_note: z.string().nullable().default(null),
  urgency: z.string().nullable().default(null),
  used_llm: z.boolean(),
});
export type AssistResponse = z.infer<typeof AssistResponseSchema>;
