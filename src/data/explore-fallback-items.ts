import type { ExploreItem } from "@/hooks/use-explore-feed";

function curated(
  slug: string,
  title: string,
  url: string,
  category: string,
  tags: string[],
  duration_min: number | null,
): ExploreItem {
  return {
    id: `curated-${slug}`,
    title,
    source: "youtube",
    url,
    duration_min,
    category,
    tags,
    language: "en",
    creator: null,
    thumbnail: null,
    is_verified: true,
    popularity_score: 0.72,
    created_at: "2025-01-01T00:00:00.000Z",
  };
}

/**
 * When explore-feed returns no rows for a category, show these hand-picked links
 * so Yoga, Pilates, meals, podcasts, etc. stay visible on Explore.
 */
export const EXPLORE_FALLBACK_BY_CATEGORY: Record<string, ExploreItem[]> = {
  Música: [
    curated("mu1", "Lofi hip hop — focus", "https://www.youtube.com/watch?v=jfKfPfyJRdk", "Música", ["music", "focus", "calm"], null),
    curated("mu2", "Ambient study music", "https://www.youtube.com/watch?v=4xDzrJKXOOY", "Música", ["ambient", "study"], 180),
    curated("mu3", "Classical for concentration", "https://www.youtube.com/watch?v=4VR-6TFW7Ng", "Música", ["classical", "focus"], 120),
  ],
  Audiolibros: [
    curated("ab1", "Deep Work — Cal Newport (summary)", "https://www.youtube.com/watch?v=ZD7dXfdDPfg", "Audiolibros", ["productivity", "audiobook"], 12),
    curated("ab2", "Atomic Habits ideas", "https://www.youtube.com/watch?v=o7w5r5PfBKo", "Audiolibros", ["habits", "audiobook"], 8),
    curated("ab3", "The Power of Now — key ideas", "https://www.youtube.com/watch?v=Hu4Yvq-g7_Y", "Audiolibros", ["mindfulness", "audiobook"], 15),
  ],
  Podcasts: [
    curated("pd1", "How to focus — Huberman Lab", "https://www.youtube.com/watch?v=wfMkXd2Yzog", "Podcasts", ["podcast", "focus", "science"], 90),
    curated("pd2", "Sleep toolkit", "https://www.youtube.com/watch?v=h2aWYjYA1Us", "Podcasts", ["podcast", "sleep"], 120),
    curated("pd3", "Morning routine & energy", "https://www.youtube.com/watch?v=WtKJrB5rOKs", "Podcasts", ["podcast", "energy"], 10),
  ],
  Yoga: [
    curated("yg1", "Morning yoga — 10 min", "https://www.youtube.com/watch?v=b1H3xOatxYs", "Yoga", ["yoga", "morning"], 10),
    curated("yg2", "Gentle stretch — 15 min", "https://www.youtube.com/watch?v=v7Y7kEySumY", "Yoga", ["yoga", "stretch"], 15),
    curated("yg3", "Yoga for beginners", "https://www.youtube.com/watch?v=j7rKKpwdXNE", "Yoga", ["yoga", "beginner"], 20),
  ],
  Pilates: [
    curated("pl1", "Pilates core — 15 min", "https://www.youtube.com/watch?v=NZlCLYgoc1M", "Pilates", ["pilates", "core"], 15),
    curated("pl2", "Full body pilates", "https://www.youtube.com/watch?v=IOmKzNhcnp4", "Pilates", ["pilates", "strength"], 20),
    curated("pl3", "Low-impact pilates", "https://www.youtube.com/watch?v=5v1JNalU6C8", "Pilates", ["pilates", "gentle"], 25),
  ],
  Meditación: [
    curated("md1", "10-minute meditation", "https://www.youtube.com/watch?v=ZToicYcHIOU", "Meditación", ["meditation", "guided"], 10),
    curated("md2", "Body scan — relaxation", "https://www.youtube.com/watch?v=15q-N-_VCD0", "Meditación", ["meditation", "relax"], 15),
    curated("md3", "Breathing exercise", "https://www.youtube.com/watch?v=tybOi4hjZFQ", "Meditación", ["breath", "calm"], 8),
  ],
  Calma: [
    curated("ca1", "Rain sounds — focus", "https://www.youtube.com/watch?v=eKFTSSKCzWA", "Calma", ["ambient", "rain"], null),
    curated("ca2", "Forest ambience", "https://www.youtube.com/watch?v=xNN7I81I4N8", "Calma", ["nature", "calm"], null),
    curated("ca3", "Ocean waves", "https://www.youtube.com/watch?v=WHPEKLQID4U", "Calma", ["ocean", "sleep"], null),
  ],
  Energía: [
    curated("en1", "HIIT — no equipment", "https://www.youtube.com/watch?v=ml6cT4AZdqI", "Energía", ["hiit", "energy"], 15),
    curated("en2", "Morning energy boost", "https://www.youtube.com/watch?v=UBMkMORaqC4", "Energía", ["cardio", "morning"], 12),
    curated("en3", "Power walk indoor", "https://www.youtube.com/watch?v=Vp0EhObFO88", "Energía", ["walking", "energy"], 20),
  ],
  Ejercicios: [
    curated("ej1", "Full body — 20 min", "https://www.youtube.com/watch?v=UItWltVDJmI", "Ejercicios", ["workout", "strength"], 20),
    curated("ej2", "Core strength", "https://www.youtube.com/watch?v=DHD1-2PokDI", "Ejercicios", ["core", "fitness"], 15),
    curated("ej3", "Mobility routine", "https://www.youtube.com/watch?v=s-7lyvblFNI", "Ejercicios", ["mobility", "stretch"], 10),
  ],
  Nutrición: [
    curated("nu1", "Healthy eating basics", "https://www.youtube.com/watch?v=7SXBXODfKhU", "Nutrición", ["nutrition", "health"], 12),
    curated("nu2", "Meal timing & energy", "https://www.youtube.com/watch?v=jDGMuwBuC9o", "Nutrición", ["nutrition", "energy"], 7),
    curated("nu3", "Whole foods — simple tips", "https://www.youtube.com/watch?v=3Xm1P3Wc2Jc", "Nutrición", ["nutrition", "whole-foods"], 18),
  ],
  Recetas: [
    curated("rc1", "Quick healthy meals", "https://www.youtube.com/watch?v=09gplAlpgvI", "Recetas", ["recipes", "quick"], 12),
    curated("rc2", "Mediterranean bowl ideas", "https://www.youtube.com/watch?v=Z7ZYJxS5q2w", "Recetas", ["recipes", "healthy"], 15),
    curated("rc3", "High-protein lunches", "https://www.youtube.com/watch?v=K8OJFNh4ayY", "Recetas", ["recipes", "protein"], 10),
  ],
  MealPreps: [
    curated("mp1", "Weekly meal prep — 1 hour", "https://www.youtube.com/watch?v=H0tz2gSqQ40", "MealPreps", ["meal-prep", "batch"], 60),
    curated("mp2", "Budget meal prep", "https://www.youtube.com/watch?v=7DbsU9B72Vc", "MealPreps", ["meal-prep", "budget"], 25),
    curated("mp3", "Containers & storage tips", "https://www.youtube.com/watch?v=8qOHe6DKuUs", "MealPreps", ["meal-prep", "tips"], 8),
  ],
  PlanesDeComida: [
    curated("pln1", "7-day healthy plan ideas", "https://www.youtube.com/watch?v=XGAJyxW10w0", "PlanesDeComida", ["meal-plan", "week"], 15),
    curated("pln2", "Balanced plate method", "https://www.youtube.com/watch?v=Gmh_xMmJ9Iw", "PlanesDeComida", ["meal-plan", "balance"], 10),
    curated("pln3", "Plant-forward week", "https://www.youtube.com/watch?v=7kG7XQ5TJaM", "PlanesDeComida", ["meal-plan", "plants"], 20),
  ],
};

export function isCuratedExploreItem(id: string): boolean {
  return id.startsWith("curated-");
}

export function getExploreFallbackItems(categoryKey: string): ExploreItem[] {
  return EXPLORE_FALLBACK_BY_CATEGORY[categoryKey] ?? [];
}
