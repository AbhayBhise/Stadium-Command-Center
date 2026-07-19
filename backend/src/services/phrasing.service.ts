const DEFAULT_LANG = 'en';

const MEANS: Record<string, Record<string, string>> = {
  en: { walk: 'walk', ramp: 'take the ramp', elevator: 'take the elevator', stairs: 'take the stairs' },
  es: { walk: 'camine', ramp: 'tome la rampa', elevator: 'tome el ascensor', stairs: 'suba por las escaleras' },
  fr: { walk: 'marchez', ramp: 'empruntez la rampe', elevator: "prenez l'ascenseur", stairs: 'prenez les escaliers' },
};

const CROWD_WORD: Record<string, Record<string, string>> = {
  en: { low: 'low', medium: 'moderate', high: 'high' },
  es: { low: 'baja', medium: 'moderada', high: 'alta' },
  fr: { low: 'faible', medium: 'modérée', high: 'élevée' },
};

const TYPE_LABEL: Record<string, Record<string, string>> = {
  en: {
    restroom: 'restroom', accessible_restroom: 'accessible restroom', first_aid: 'first aid station',
    concession: 'concession', guest_services: 'guest services desk', water: 'water refill point',
    sensory_room: 'sensory room', exit: 'exit', gate: 'gate', seat: 'seat', elevator: 'elevator',
  },
  es: {
    restroom: 'aseo', accessible_restroom: 'aseo accesible', first_aid: 'puesto de primeros auxilios',
    concession: 'puesto de comida', guest_services: 'punto de atención', water: 'fuente de agua',
    sensory_room: 'sala sensorial', exit: 'salida', gate: 'puerta', seat: 'asiento', elevator: 'ascensor',
  },
  fr: {
    restroom: 'toilettes', accessible_restroom: 'toilettes accessibles', first_aid: 'poste de premiers secours',
    concession: 'point de restauration', guest_services: "comptoir d'accueil", water: "point d'eau",
    sensory_room: 'salle sensorielle', exit: 'sortie', gate: 'porte', seat: 'place', elevator: 'ascenseur',
  },
};

const STEP: Record<string, Record<string, string>> = {
  en: { final: '{verb} to {to}, where you\'ll find {name}{lm}.', mid: '{verb} to {to}.' },
  es: { final: '{verb} hasta {to}, donde encontrará {name}{lm}.', mid: '{verb} hasta {to}.' },
  fr: { final: "{verb} jusqu'à {to}, où se trouve {name}{lm}.", mid: "{verb} jusqu'à {to}." },
};

const ALT_NOTE: Record<string, string> = {
  en: 'A closer {label} was crowded, so a quieter one is suggested.',
  es: 'Un {label} más cercano estaba muy concurrido; se sugiere una opción más tranquila.',
  fr: 'Un(e) {label} plus proche était bondé(e) : une option plus calme est proposée.',
};

const URGENCY: Record<string, string> = {
  en: 'Kickoff in under 15 minutes — please hurry.',
  es: 'El partido comienza en menos de 15 minutos: dese prisa.',
  fr: "Coup d'envoi dans moins de 15 minutes — dépêchez-vous.",
};

const ANSWER: Record<string, Record<string, string>> = {
  en: {
    dest: 'Your destination is {name}{lm}.',
    here: "You're already at this location.",
    route: 'Follow the {n}-step route below (about {d} m).',
    crowd: 'Crowd level there is currently {c}.',
    landmark: 'These directions use landmarks and are optimized for screen readers.',
    captioned: 'Look for visual signage on the way; a quiet Sensory Room is available if you need it.',
    hurry: 'Kickoff is very soon — please head there quickly.',
  },
  es: {
    dest: 'Su destino es {name}{lm}.',
    here: 'Ya se encuentra en este lugar.',
    route: 'Siga la ruta de abajo en {n} paso(s) (unos {d} m).',
    crowd: 'La afluencia allí es actualmente {c}.',
    landmark: 'Estas indicaciones se basan en puntos de referencia y están optimizadas para lectores de pantalla.',
    captioned: 'Busque la señalización visual por el camino; hay una sala sensorial tranquila disponible si la necesita.',
    hurry: 'El partido está a punto de comenzar: diríjase allí rápidamente.',
  },
  fr: {
    dest: 'Votre destination est {name}{lm}.',
    here: 'Vous y êtes déjà.',
    route: "Suivez l'itinéraire ci-dessous en {n} étape(s) (environ {d} m).",
    crowd: "L'affluence sur place est actuellement {c}.",
    landmark: "Ces indications s'appuient sur des points de repère et sont optimisées pour les lecteurs d'écran.",
    captioned: 'Repérez la signalétique visuelle en chemin ; une salle sensorielle calme est disponible au besoin.',
    hurry: 'Le coup d\'envoi est imminent — rendez-vous-y rapidement.',
  },
};

function langCode(language: string): string {
  return MEANS[language] ? language : DEFAULT_LANG;
}

function cap(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function typeLabel(facilityType: string, language: string): string {
  const code = langCode(language);
  return TYPE_LABEL[code][facilityType] || facilityType.replace(/_/g, ' ');
}

export function stepInstruction(
  means: string,
  toName: string,
  landmark: string | null | undefined,
  isFinal: boolean,
  facilityName: string,
  language: string
): string {
  const code = langCode(language);
  const verb = cap(MEANS[code][means] || MEANS[code]['walk']);
  const lm = isFinal && landmark ? ` (${landmark})` : '';
  const template = STEP[code][isFinal ? 'final' : 'mid'];
  return template
    .replace('{verb}', verb)
    .replace('{to}', toName)
    .replace('{name}', facilityName)
    .replace('{lm}', lm);
}

export function alternativesNote(facilityType: string, language: string): string {
  const code = langCode(language);
  return ALT_NOTE[code].replace('{label}', typeLabel(facilityType, code));
}

export function urgencyNote(language: string): string {
  return URGENCY[langCode(language)];
}

export interface PhrasingContext {
  language: string;
  facilityName: string;
  facilityType: string;
  facilityLandmark: string | null | undefined;
  crowdLevel: string;
  accessibilityMode: string;
  landmarkBased: boolean;
  hurry: boolean;
  alternativeType: string | null | undefined;
  totalDistance: number;
  stepCount: number;
}

export function renderAnswer(ctx: PhrasingContext): string {
  const code = langCode(ctx.language);
  const a = ANSWER[code];
  const crowd = CROWD_WORD[code][ctx.crowdLevel];
  const destLm = ctx.facilityLandmark ? ` (${ctx.facilityLandmark})` : '';

  const parts: string[] = [a.dest.replace('{name}', ctx.facilityName).replace('{lm}', destLm)];

  if (ctx.stepCount === 0) {
    parts.push(a.here);
  } else {
    parts.push(a.route.replace('{n}', String(ctx.stepCount)).replace('{d}', String(ctx.totalDistance)));
  }

  parts.push(a.crowd.replace('{c}', crowd));

  if (ctx.alternativeType) {
    parts.push(alternativesNote(ctx.alternativeType, code));
  }
  if (ctx.landmarkBased) {
    parts.push(a.landmark);
  }
  if (ctx.accessibilityMode === 'captioned') {
    parts.push(a.captioned);
  }
  if (ctx.hurry) {
    parts.push(a.hurry);
  }

  return parts.join(' ');
}
