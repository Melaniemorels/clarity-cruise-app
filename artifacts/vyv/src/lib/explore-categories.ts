/**
 * Maps the catalogue's internal category keys (stored in Spanish in
 * explore_items.category) to i18n label keys so category names always
 * render in the app's UI language.
 */
export const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Música: "explore.categories.music",
  Audiolibros: "explore.categories.audiobooks",
  Podcasts: "explore.categories.podcasts",
  Yoga: "explore.categories.yoga",
  Pilates: "explore.categories.pilates",
  Meditación: "explore.categories.meditation",
  Calma: "explore.categories.calm",
  Energía: "explore.categories.energy",
  Ejercicios: "explore.categories.exercises",
  Nutrición: "explore.categories.nutrition",
  PlanesDeComida: "explore.categories.mealPlans",
  MealPreps: "explore.categories.mealPlans",
  Motivacional: "explore.categories.motivational",
};

/** Returns the i18n key for a category, or null when unknown. */
export function categoryLabelKey(category: string | null | undefined): string | null {
  if (!category) return null;
  return CATEGORY_LABEL_KEYS[category] ?? null;
}
