import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DwellSignal {
  category: string;
  total_ms: number;
  item_count: number;
}

interface CalendarSignal {
  upcoming_event_type: string | null;
  free_minutes: number | null;
  next_event_title: string | null;
  next_event_starts_at: string | null;
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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? "generate";
    const target = body.target ?? "both"; // "explorer" | "home" | "both"
    const language = body.language ?? "es";

    // ---- Mode: log_dwell ----
    if (mode === "log_dwell") {
      const { item_id, category, dwell_ms, source } = body;
      if (!dwell_ms || dwell_ms < 500) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient.from("dwell_events").insert({
        user_id: userId,
        item_id: item_id || null,
        category: category || null,
        dwell_ms,
        source: source || "explore",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Mode: generate ----
    // Check cache first
    const { data: cached } = await supabase
      .from("contextual_recommendations")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached && !body.force_refresh) {
      return new Response(JSON.stringify({
        recommendations: cached.recommendations,
        signals: cached.signals_used,
        cached: true,
        target,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather signals in parallel
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const [dwellRes, calendarRes, exploreItemsRes] = await Promise.all([
      // Recent dwell events (last 2 hours)
      supabase
        .from("dwell_events")
        .select("category, dwell_ms, item_id")
        .eq("user_id", userId)
        .gte("created_at", twoHoursAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(200),
      // Upcoming calendar events (next 4 hours)
      supabase
        .from("calendar_events")
        .select("title, category, starts_at, ends_at")
        .eq("user_id", userId)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", fourHoursFromNow.toISOString())
        .order("starts_at", { ascending: true })
        .limit(10),
      // Available explore items for context
      supabase
        .from("explore_items")
        .select("id, title, category, tags, duration_min, url, creator, source")
        .limit(100),
    ]);

    // Process dwell signals — aggregate by category
    const dwellEvents = dwellRes.data ?? [];
    const categoryTotals: Record<string, { total_ms: number; count: number }> = {};
    for (const ev of dwellEvents) {
      if (!ev.category) continue;
      if (!categoryTotals[ev.category]) categoryTotals[ev.category] = { total_ms: 0, count: 0 };
      categoryTotals[ev.category].total_ms += ev.dwell_ms;
      categoryTotals[ev.category].count += 1;
    }

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b.total_ms - a.total_ms)
      .slice(0, 5)
      .map(([cat, data]) => ({
        category: cat,
        total_ms: data.total_ms,
        item_count: data.count,
      }));

    // Process calendar signals
    const calendarEvents = calendarRes.data ?? [];
    const nextEvent = calendarEvents[0] ?? null;
    let freeMinutes: number | null = null;

    if (nextEvent) {
      const eventStart = new Date(nextEvent.starts_at);
      freeMinutes = Math.round((eventStart.getTime() - now.getTime()) / 60000);
    }

    const calendarSignal: CalendarSignal = {
      upcoming_event_type: nextEvent?.category ?? null,
      free_minutes: freeMinutes,
      next_event_title: nextEvent?.title ?? null,
      next_event_starts_at: nextEvent?.starts_at ?? null,
    };

    const signals = {
      dwell: topCategories,
      calendar: calendarSignal,
      timestamp: now.toISOString(),
    };

    // Build AI prompt
    const availableCategories = [...new Set((exploreItemsRes.data ?? []).map(i => i.category))];
    
    const systemPrompt = language === "es"
      ? `Eres un asistente de bienestar de VYV. Generas recomendaciones de contenido personalizadas basándote en el comportamiento de scroll del usuario y su calendario. Responde SOLO con el JSON del tool call.`
      : `You are a VYV wellness assistant. Generate personalized content recommendations based on user scroll behavior and calendar. Respond ONLY with the tool call JSON.`;

    const userPrompt = language === "es"
      ? `Contexto del usuario:

SEÑALES DE SCROLL (dwell time - cuánto se detuvo en cada categoría):
${topCategories.length > 0 ? topCategories.map(c => `- ${c.category}: ${Math.round(c.total_ms / 1000)}s de atención, ${c.item_count} items`).join("\n") : "- Sin datos de scroll recientes"}

CALENDARIO:
${calendarSignal.next_event_title ? `- Próximo evento: "${calendarSignal.next_event_title}" (${calendarSignal.upcoming_event_type}) en ${freeMinutes} minutos` : "- Sin eventos próximos"}
${freeMinutes ? `- Tiempo libre disponible: ${freeMinutes} minutos` : ""}

CATEGORÍAS DISPONIBLES: ${availableCategories.join(", ")}

TARGET: ${target === "home" ? "Recomendaciones rápidas conceptuales para Home (max 3, breves)" : target === "explorer" ? "Recomendaciones de descubrimiento profundo para Explorer (max 6)" : "Ambos: 3 rápidas para Home + 6 para Explorer"}

Genera recomendaciones relevantes. Si el usuario se detuvo mucho en Yoga, sugiere más Yoga y categorías complementarias (Meditación, Calma). Si tiene un evento de trabajo pronto, sugiere contenido de enfoque corto. Si tiene tiempo libre, sugiere contenido más largo.`
      : `User context:

SCROLL SIGNALS (dwell time):
${topCategories.length > 0 ? topCategories.map(c => `- ${c.category}: ${Math.round(c.total_ms / 1000)}s attention, ${c.item_count} items`).join("\n") : "- No recent scroll data"}

CALENDAR:
${calendarSignal.next_event_title ? `- Next event: "${calendarSignal.next_event_title}" (${calendarSignal.upcoming_event_type}) in ${freeMinutes} minutes` : "- No upcoming events"}
${freeMinutes ? `- Free time available: ${freeMinutes} minutes` : ""}

AVAILABLE CATEGORIES: ${availableCategories.join(", ")}

TARGET: ${target === "home" ? "Quick conceptual recommendations for Home (max 3, brief)" : target === "explorer" ? "Deep discovery recommendations for Explorer (max 6)" : "Both: 3 quick for Home + 6 for Explorer"}

Generate relevant recommendations.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: return top explore items based on dwell categories
      const fallbackItems = (exploreItemsRes.data ?? [])
        .filter(i => topCategories.some(c => c.category === i.category))
        .slice(0, 6);

      const fallbackReason = lang === "es" ? "Basado en tu navegación reciente" : "Based on your recent browsing";

      return new Response(JSON.stringify({
        recommendations: {
          home: fallbackItems.slice(0, 3).map(i => ({
            title: i.title,
            category: i.category,
            reason: fallbackReason,
            duration_min: i.duration_min,
            url: i.url,
            item_id: i.id,
          })),
          explorer: fallbackItems.map(i => ({
            title: i.title,
            category: i.category,
            reason: fallbackReason,
            duration_min: i.duration_min,
            url: i.url,
            item_id: i.id,
          })),
        },
        signals,
        cached: false,
        target,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_recommendations",
              description: "Return personalized content recommendations",
              parameters: {
                type: "object",
                properties: {
                  home: {
                    type: "array",
                    description: "Quick recommendations for Home page (max 3)",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Descriptive title" },
                        category: { type: "string", description: "Content category" },
                        reason: { type: "string", description: "Brief reason why recommended (1 sentence)" },
                        duration_min: { type: "number", description: "Suggested duration in minutes" },
                        mood: { type: "string", enum: ["calm", "energizing", "focused", "uplifting", "relaxing"] },
                      },
                      required: ["title", "category", "reason", "duration_min", "mood"],
                    },
                  },
                  explorer: {
                    type: "array",
                    description: "Deep discovery recommendations for Explorer (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Descriptive title" },
                        category: { type: "string", description: "Content category" },
                        reason: { type: "string", description: "Detailed reason why recommended" },
                        duration_min: { type: "number", description: "Suggested duration in minutes" },
                        mood: { type: "string", enum: ["calm", "energizing", "focused", "uplifting", "relaxing"] },
                        tags: { type: "array", items: { type: "string" }, description: "Relevant tags" },
                      },
                      required: ["title", "category", "reason", "duration_min", "mood"],
                    },
                  },
                },
                required: ["home", "explorer"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let recommendations = { home: [], explorer: [] };

    if (toolCall?.function?.arguments) {
      try {
        recommendations = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI response");
      }
    }

    // Match AI suggestions with actual explore items where possible
    const exploreItems = exploreItemsRes.data ?? [];
    const matchItem = (rec: any) => {
      const match = exploreItems.find(
        (i) => i.category === rec.category && (!rec.duration_min || !i.duration_min || Math.abs(i.duration_min - rec.duration_min) <= 10)
      );
      if (match) {
        return { ...rec, url: match.url, item_id: match.id, source: match.source, creator: match.creator };
      }
      return rec;
    };

    recommendations.home = (recommendations.home || []).map(matchItem);
    recommendations.explorer = (recommendations.explorer || []).map(matchItem);

    // Cache recommendations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("contextual_recommendations").insert({
      user_id: userId,
      context_type: "calendar_scroll",
      recommendations,
      signals_used: signals,
      expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify({
      recommendations,
      signals,
      cached: false,
      target,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("contextual-recommendations error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
