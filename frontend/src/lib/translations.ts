/**
 * Context-aware multilingual translation service.
 * Provides translations for stadium-specific phrases with urgency detection.
 */

export type Language = 'en' | 'es' | 'fr' | 'ar' | 'zh' | 'de' | 'ja';

interface TranslationEntry {
  en: string;
  es: string;
  fr: string;
  ar: string;
  zh: string;
  de: string;
  ja: string;
}

const TRANSLATIONS: Record<string, TranslationEntry> = {
  'Follow me': {
    en: 'Follow me',
    es: 'Sígame',
    fr: 'Suivez-moi',
    ar: 'اتبعني',
    zh: '跟我来 (gēn wǒ lái)',
    de: 'Folgen Sie mir',
    ja: 'ついて来て下さい (suite kite kudasai)',
  },
  'This way to your seat': {
    en: 'This way to your seat',
    es: 'Por aquí a su asiento',
    fr: "Par ici pour votre siège",
    ar: 'من هنا إلى مقعدك',
    zh: '去您的座位这边走 (qù nín de zuò wèi zhè bian zǒu)',
    de: 'Hier entlang zu Ihrem Sitzplatz',
    ja: 'こちらがお席です (kochira ga o-seki desu)',
  },
  'Restroom is to your left': {
    en: 'Restroom is to your left',
    es: 'El baño está a su izquierda',
    fr: 'Les toilettes sont à gauche',
    ar: 'الحمام على يسارك',
    zh: '洗手间在您的左边 (xǐ shǒu jiān zài nín de zuǒ biān)',
    de: 'Die Toilette ist zu Ihrer Linken',
    ja: 'お手洗いは左側です (otearai wa hidarigawa desu)',
  },
  'Please have your ticket ready': {
    en: 'Please have your ticket ready',
    es: 'Por favor tenga su boleto listo',
    fr: 'Veuillez préparer votre billet SVP',
    ar: 'يرجى تجهيز تذكرتك',
    zh: '请准备好您的门票 (qǐng zhǔn bèi hǎo nín de mén piào)',
    de: 'Bitte halten Sie Ihr Ticket bereit',
    ja: 'チケットをご用意ください (chiketto wo go-youi kudasai)',
  },
  'Emergency exit this way': {
    en: 'Emergency exit this way',
    es: 'Salida de emergencia por aquí',
    fr: 'Sortie de secours par ici',
    ar: 'مخرج الطوارئ من هنا',
    zh: '紧急出口这边走 (jǐn jí chū kǒu zhè biān zǒu)',
    de: 'Notausgang hier entlang',
    ja: '非常口はこちらです (hijōguchi wa kochira desu)',
  },
  'Remain calm': {
    en: 'Remain calm',
    es: 'Mantenga la calma',
    fr: 'Restez calme',
    ar: 'حافظ على هدوئك',
    zh: '请保持冷静 (qǐng bǎo chí lěng jìng)',
    de: 'Bleiben Sie ruhig',
    ja: '落ち着いてください (ochitsuite kudasai)',
  },
  'Proceed to the nearest exit': {
    en: 'Proceed to the nearest exit',
    es: 'Diríjase a la salida más cercana',
    fr: 'Rendez-vous à la sortie la plus proche',
    ar: 'توجه إلى أقرب مخرج',
    zh: '前往最近的出口 (qián wǎng zuì jìn de chū kǒu)',
    de: 'Begeben Sie sich zum nächsten Ausgang',
    ja: '最寄りの出口へお進みください (moyori no deguchi e o-susumi kudasai)',
  },
  'Do not use elevators': {
    en: 'Do not use elevators',
    es: 'No use los ascensores',
    fr: "N'utilisez pas les ascenseurs",
    ar: 'لا تستخدم المصاعد',
    zh: '请不要使用电梯 (qǐng bú yào shǐ yòng diàn tī)',
    de: 'Benutzen Sie keine Aufzüge',
    ja: 'エレベーターは使用しないでください (erebētā wa shiyō shinaide kudasai)',
  },
  'Medical assistance is on the way': {
    en: 'Medical assistance is on the way',
    es: 'La asistencia médica está en camino',
    fr: 'Les secours médicaux sont en route',
    ar: 'المساعدة الطبية في الطريق',
    zh: '医疗救助正在路上 (yī liáo jiù zhù zhèng zài lù shàng)',
    de: 'Medizinische Hilfe ist unterwegs',
    ja: '医師の手配をしました (ishi no tehai wo shimashita)',
  },
};

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  zh: '中文',
  de: 'Deutsch',
  ja: '日本語',
};

export function detectLanguage(text: string): Language {
  // Simple detection based on character ranges
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u4E00-\u9FFF]/.test(text) || /[\u3400-\u4DBF]/.test(text)) return 'zh';
  if (/[\u3040-\u309F]/.test(text) || /[\u30A0-\u30FF]/.test(text)) return 'ja';
  const commonWords: Partial<Record<Language, string[]>> = {
    es: ['hola', 'gracias', 'por favor', 'adiós', 'baño', 'salida', 'ayuda', 'emergencia', 'calma', 'dónde', 'está'],
    fr: ['bonjour', 'merci', 's\'il vous plaît', 'au revoir', 'toilettes', 'sortie', 'aide', 'urgence', 'calme', 'où'],
    de: ['guten tag', 'danke', 'bitte', 'auf wiedersehen', 'toilette', 'ausgang', 'hilfe', 'notfall', 'ruhig', 'wo'],
  };
  const lower = text.toLowerCase();
  for (const [lang, words] of Object.entries(commonWords)) {
    for (const word of words) {
      if (lower.includes(word)) return lang as Language;
    }
  }
  return 'en';
}

/**
 * Translate a phrase into target language
 */
export function translatePhrase(phrase: string, toLang: Language): string {
  const entry = TRANSLATIONS[phrase];
  if (!entry) return phrase;
  return entry[toLang] || entry.en;
}

/**
 * Translate with urgency detection
 * If urgency is high, we include important emergency phrases in the target language.
 */
export function translateWithUrgency(phrase: string, toLang: Language, urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'): {
  translation: string;
  languageName: string;
  importantNotes?: string[];
} {
  const translation = translatePhrase(phrase, toLang);
  const languageName = LANGUAGE_NAMES[toLang];
  const importantNotes: string[] = [];

  if (urgency !== 'LOW') {
    importantNotes.push(`Key emergency phrase: ${TRANSLATIONS['Emergency exit this way']?.[toLang] || 'N/A'}`);
    importantNotes.push(`Key safety phrase: ${TRANSLATIONS['Remain calm']?.[toLang] || 'N/A'}`);
  }

  if (urgency === 'HIGH') {
    importantNotes.push(`Urgent: ${TRANSLATIONS['Proceed to the nearest exit']?.[toLang] || 'N/A'}`);
    importantNotes.push(`Medical: ${TRANSLATIONS['Medical assistance is on the way']?.[toLang] || 'N/A'}`);
  }

  return { translation, languageName, importantNotes };
}

/**
 * Context-aware: provide the best phrase for a given context
 */
export function getPhraseForContext(
  context: 'general' | 'emergency' | 'medical' | 'navigation' | 'food',
  lang: Language
): string {
  const phraseMap: Record<string, string> = {
    general: 'This way to your seat',
    emergency: 'Remain calm',
    medical: 'Medical assistance is on the way',
    navigation: 'Follow me',
    food: 'Please have your ticket ready',
  };
  const phrase = phraseMap[context] || phraseMap.general;
  return translatePhrase(phrase, lang);
}

/**
 * Get broad translation categories for quick reference
 */
export function getQuickTranslations(lang: Language): { category: string; entries: { phrase: string; translation: string }[] }[] {
  const categories = [
    { category: 'Greetings', phrases: ['Follow me', 'This way to your seat'] },
    { category: 'Facilities', phrases: ['Restroom is to your left', 'Please have your ticket ready'] },
    { category: 'Safety', phrases: ['Emergency exit this way', 'Remain calm'] },
    { category: 'Emergency', phrases: ['Proceed to the nearest exit', 'Do not use elevators', 'Medical assistance is on the way'] },
  ];
  return categories.map((c) => ({
    category: c.category,
    entries: c.phrases.map((p) => ({ phrase: p, translation: translatePhrase(p, lang) })),
  }));
}
