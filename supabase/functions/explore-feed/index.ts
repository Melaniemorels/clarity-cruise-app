import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExploreItem {
  id: string;
  title: string;
  source: string;
  url: string;
  duration_min: number | null;
  category: string;
  tags: string[];
  language: string | null;
  creator: string | null;
  thumbnail: string | null;
  is_verified: boolean;
  popularity_score: number;
  created_at: string;
}

interface UserPrefs {
  language: string | null;
  goals: string[];
  preferred_tags: string[];
  blocked_creators: string[];
}

// ---- Scoring ----

function scoreItem(
  item: ExploreItem,
  prefs: UserPrefs,
  topTags: string[],
  recentCategories: string[]
): number {
  const preferred = prefs.preferred_tags ?? [];
  const tags = item.tags ?? [];

  const tagHits =
    tags.filter((t) => preferred.includes(t)).length * 3 +
    tags.filter((t) => topTags.includes(t)).length * 2;

  const catBoost = recentCategories.includes(item.category) ? 1.2 : 1.0;
  const verifiedBoost = item.is_verified ? 1.15 : 1.0;
  const langBoost =
    !prefs.language || !item.language
      ? 1.0
      : prefs.language === item.language
        ? 1.1
        : 0.9;
  const pop = item.popularity_score ?? 0.4;

  return (tagHits + pop * 2) * catBoost * verifiedBoost * langBoost;
}

function diversify<T>(sorted: T[], rate = 0.18): T[] {
  const res: T[] = [];
  const pool = [...sorted];
  while (pool.length) {
    const pickRandom = Math.random() < rate;
    const idx = pickRandom
      ? Math.floor(Math.random() * Math.min(pool.length, 12))
      : 0;
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? "for_you";
    const category: string | null = body.category ?? null;
    const page: number = body.page ?? 0;
    const pageSize: number = Math.min(body.pageSize ?? 8, 50);

    // Fetch user prefs, events, and items in parallel
    const [prefsRes, eventsRes, itemsRes] = await Promise.all([
      supabase
        .from("user_explore_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_item_events")
        .select("item_id, event")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(600),
      supabase
        .from("explore_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const prefs: UserPrefs = prefsRes.data ?? {
      language: null,
      goals: [],
      preferred_tags: [],
      blocked_creators: [],
    };

    const events = eventsRes.data ?? [];
    const allItems: ExploreItem[] = (itemsRes.data ?? []) as ExploreItem[];

    // Filter by category if specified
    let pool = category
      ? allItems.filter((i) => i.category === category)
      : allItems;

    // Build seen set & interaction signals
    const seenIds = new Set(
      events
        .filter((e) => ["seen", "open", "dismiss"].includes(e.event))
        .map((e) => e.item_id)
    );

    const openedCategories = events
      .filter((e) => ["open", "save"].includes(e.event))
      .slice(0, 30)
      .map((e) => {
        const item = allItems.find((i) => i.id === e.item_id);
        return item?.category;
      })
      .filter(Boolean) as string[];

    const recentCategories = [...new Set(openedCategories)];

    // Infer top tags from opened items
    const topTags = [
      ...new Set(
        events
          .filter((e) => ["open", "save"].includes(e.event))
          .slice(0, 20)
          .flatMap((e) => {
            const item = allItems.find((i) => i.id === e.item_id);
            return item?.tags ?? [];
          })
      ),
    ];

    const blockedCreators = new Set(prefs.blocked_creators ?? []);

    // Filter: remove blocked creators & already-seen (unless saved)
    const savedIds = new Set(
      events.filter((e) => e.event === "save").map((e) => e.item_id)
    );

    const filtered = pool.filter((item) => {
      if (blockedCreators.has(item.creator ?? "")) return false;
      if (seenIds.has(item.id) && !savedIds.has(item.id)) return false;
      return true;
    });

    // If too few after filtering, relax the seen constraint
    const candidates =
      filtered.length < pageSize
        ? pool.filter((item) => !blockedCreators.has(item.creator ?? ""))
        : filtered;

    // Score & rank
    const ranked = candidates
      .map((item) => ({
        item,
        score: scoreItem(item, prefs, topTags, recentCategories),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    // Deduplicate creators in top results
    const usedCreators = new Set<string>();
    const deduped: ExploreItem[] = [];
    for (const it of ranked) {
      const c = it.creator ?? "";
      if (c && usedCreators.has(c)) continue;
      deduped.push(it);
      if (c) usedCreators.add(c);
      if (deduped.length >= pageSize * 4) break;
    }

    // Diversify
    const explorationRate = mode === "for_you" ? 0.12 : 0.2;
    const mixed = diversify(deduped, explorationRate);

    // Paginate
    const start = mode === "see_all" ? page * pageSize : 0;
    const result = mixed.slice(start, start + pageSize);
    const hasMore =
      mode === "see_all" ? start + pageSize < mixed.length : false;

    return new Response(
      JSON.stringify({
        items: result,
        nextPage: hasMore ? page + 1 : null,
        total: mixed.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("explore-feed error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
