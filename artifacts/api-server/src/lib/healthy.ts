// Healthy-content engine: taxonomy, keyword classifier and helpers.
//
// The Explorer is wellness-only. Every piece of content that enters
// explore_items must be classified into one of the healthy categories below
// (they match the category keys the frontend carousels filter by). Anything
// that does not match a healthy category is rejected at ingestion time.

export const HEALTHY_CATEGORIES = [
  "Yoga",
  "Pilates",
  "Ejercicios", // stretching / mobility / home workouts
  "Meditación",
  "Calma", // breathwork, relaxing sounds, sleep
  "Energía",
  "Nutrición", // healthy cooking
  "PlanesDeComida", // meal prep / weekly plans
  "Motivacional", // motivational audio / talks
  "Podcasts", // wellness podcasts
] as const;

export type HealthyCategory = (typeof HEALTHY_CATEGORIES)[number];

export const HEALTHY_CATEGORY_SET: ReadonlySet<string> = new Set(
  HEALTHY_CATEGORIES,
);

// Ordered rules: first match wins (more specific categories first).
const RULES: { category: HealthyCategory; pattern: RegExp }[] = [
  { category: "Yoga", pattern: /\byoga\b|vinyasa|hatha|asana|sun salutation|saludo al sol/i },
  { category: "Pilates", pattern: /\bpilates\b/i },
  {
    category: "Meditación",
    pattern:
      /meditaci[oó]n|meditation|mindfulness|body scan|meditar|guided (sleep|relaxation)|relajaci[oó]n guiada/i,
  },
  {
    category: "Calma",
    pattern:
      /breathwork|respiraci[oó]n|breathing exercise|calm|calma|sleep sounds|sonidos para dormir|ambient|nature sounds|anti[- ]?estr[eé]s|stress relief|ansiedad|anxiety relief/i,
  },
  {
    category: "PlanesDeComida",
    pattern: /meal ?prep|meal ?plan|plan de comidas|batch cooking|prepara(r)? comidas|weekly meals/i,
  },
  {
    category: "Nutrición",
    pattern:
      /nutrici[oó]n|nutrition|healthy (recipe|eating|food|meal)|receta(s)? saludable(s)?|comida saludable|dieta equilibrada|high protein|alta? en prote[ií]na/i,
  },
  {
    category: "Ejercicios",
    pattern:
      /estiramiento|stretch|flexibilit|movilidad|mobility|home workout|entrenamiento en casa|full body|hiit|low impact|bajo impacto|posture|postura|core workout|abdominales/i,
  },
  {
    category: "Motivacional",
    pattern:
      /motivaci[oó]n|motivational|motivacional|discurso|inspirational|inspiraci[oó]n|h[aá]bitos|habits|disciplina|discipline|mentalidad|mindset|superaci[oó]n/i,
  },
  {
    category: "Podcasts",
    pattern: /podcast.*(bienestar|wellness|salud|health|mente|mind)|(bienestar|wellness|salud mental).*podcast/i,
  },
  {
    category: "Energía",
    pattern: /energizing|energ[ií]a|morning routine|rutina de la mañana|wake ?up|despertar/i,
  },
];

// Hard blockers: even if a healthy keyword matches, reject clearly
// off-mission content.
const BLOCKED = /gaming|gameplay|crypto|apuestas|casino|mukbang|fast food challenge|borracher|alcohol tour|prank|drama|chisme|gossip/i;

/**
 * True when the content matches a hard blocker (off-mission content that must
 * never enter the catalogue, even via curated-search category fallbacks).
 */
export function isBlockedContent(title: string, extra: string[] = []): boolean {
  return BLOCKED.test([title, ...extra].join(" "));
}

/**
 * Classify a piece of content (title + optional channel/tags) into a healthy
 * category, or return null when it is not wellness content.
 */
export function classifyHealthy(
  title: string,
  extra: string[] = [],
): HealthyCategory | null {
  const text = [title, ...extra].join(" ");
  if (BLOCKED.test(text)) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return null;
}

/** ISO-8601 YouTube duration (PT1H23M45S) → whole minutes (null if unknown). */
export function isoDurationToMinutes(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const minutes =
    Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) + (Number(m[3] ?? 0) >= 30 ? 1 : 0);
  return Math.max(1, minutes);
}

// Per-category YouTube search queries used to keep the catalogue stocked with
// real, current wellness content (Spanish-first with English fallback mix).
export const CATEGORY_SEARCH_QUERIES: Record<HealthyCategory, string> = {
  Yoga: "yoga en casa para principiantes",
  Pilates: "pilates en casa rutina completa",
  Ejercicios: "estiramientos y movilidad guiados",
  Meditación: "meditación guiada en español",
  Calma: "ejercicios de respiración para relajarse",
  Energía: "rutina de la mañana energía",
  Nutrición: "recetas saludables fáciles",
  PlanesDeComida: "meal prep semanal saludable",
  Motivacional: "audio motivacional hábitos disciplina",
  Podcasts: "podcast bienestar y salud mental",
};

// Time-of-day → categories that fit that moment (used by contextual recs).
export const TIME_OF_DAY_CATEGORIES: Record<string, HealthyCategory[]> = {
  morning: ["Yoga", "Energía", "Ejercicios", "Motivacional"],
  midday: ["Nutrición", "PlanesDeComida", "Ejercicios", "Podcasts"],
  afternoon: ["Pilates", "Ejercicios", "Podcasts", "Motivacional"],
  evening: ["Meditación", "Calma", "Yoga", "Podcasts"],
};
