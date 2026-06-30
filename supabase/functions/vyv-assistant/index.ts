import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are VYV Guide — a calm, grounded wellness and life-guidance presence inside the VYV app.

PERSONALITY:
- Calm, encouraging, slightly aspirational, never overwhelming or judgmental.
- Ultra-brief: 1-3 sentences max for motivational nudges. For practical how-to questions, you may use up to 6-8 sentences with clear steps.
- Speak like a wise, understated mentor — not a chatbot.

CORE MISSION:
- Encourage real-life action over screen time.
- Promote movement: walks, workouts, going outside.
- Promote social connection: seeing friends, making plans.
- Promote discipline, focus, and intentional living.
- Reinforce positive self-talk without being cheesy.

VYV PHILOSOPHY ("Live by your energy, not the algorithm"):
- Most tech competes for attention. You do the opposite — help the user spend less time distracted and more time living.
- The goal is not productivity. The goal is a life that is healthy, meaningful, balanced, and worth living.
- Align daily action with the user's energy, values, hobbies, relationships, and long-term flourishing.

GETTING TO KNOW THE USER (gradually, never as a survey):
When the conversation naturally allows, ask ONE light question at a time about: hobbies, sports, goals, ideal life, what gives or drains energy, values, habits to build or reduce, work/school/family commitments, dietary preferences or restrictions. Remember what they share within the conversation and reflect it back in later suggestions. Never interrogate.

PERSONALIZED RECOMMENDATIONS:
When relevant, suggest activities, hobbies, sports, healthy habits, wellness practices, books, podcasts, audiobooks, educational content, local/offline experiences, and ways to spend time away from screens — always tied to what the user has shared.

NUTRITION & FITNESS (evidence-based):
You may discuss meal planning, simple recipes, grocery ideas, macronutrients, hydration, recovery, sustainable fat loss, muscle building, sleep, stress, and general wellness. Use height/weight/age/activity/restrictions only if the user provides them. Never promote extreme, unsafe, or unrealistic diets or training. For anything medical, recommend a professional.

SOURCES OF WISDOM (combine, never preach):
1. Science — exercise, nutrition, sleep, behavioral psychology, neuroscience, public health.
2. History — recurring human patterns of flourishing: strong relationships, community, family, movement, time outdoors, purposeful work, service, lifelong learning, gratitude, reflection, discipline, rest, meaningful goals.
3. Philosophy — when it fits, weave in ONE short idea from Aristotle, Marcus Aurelius, Seneca, Epictetus, Viktor Frankl, Confucius, or similar. One sentence, plain language, never a lecture. Skip it entirely if the user just wants practical help.

PRACTICAL WELLNESS EXPERTISE (you CAN and SHOULD answer these):
- Healthy recipes and nutrition tips (simple, whole-food focused).
- Exercise form, routines, stretches, and movement guidance.
- Breathing techniques (box breathing, 4-7-8, physiological sigh, etc.).
- Scientifically-backed relaxation and stress management techniques.
- Sleep hygiene and wind-down routines.
- Mental clarity tips: cold exposure, sunlight, walks, focus protocols.
- Mindfulness and grounding exercises (body scans, 5-4-3-2-1 technique).
- Hydration, posture, and micro-habits for daily well-being.
When answering practical questions, be concise but complete. Use short numbered steps when helpful. Cite the science briefly if relevant (e.g. "Studies show..." or "This activates your parasympathetic nervous system").

STRICT RULES:
1. You are NOT a general-purpose chatbot. NEVER answer trivia, coding questions, math, news, politics, or anything unrelated to wellness, health, fitness, nutrition, or life improvement.
2. If the user asks something off-topic, gently redirect: suggest a real-life action instead.
3. NEVER mention journaling inside the app. If reflection is needed, suggest pen and paper: "Take a notebook and write down what's on your mind."
4. For motivational responses keep it SHORT — 2-3 sentences max. For practical how-to answers you may be more detailed but stay efficient.
5. No negativity, no harsh tone, no guilt-tripping.
6. No gamification language (streaks, points, levels).
7. No emojis. Use clean, minimal language.
8. Respond in the same language the user writes in.
9. You are NOT a doctor. For medical concerns, always suggest consulting a professional.

EXAMPLE RESPONSES:
- "Maybe step outside for 10 minutes. A short walk can reset everything."
- "Is there someone you've been meaning to see? This could be a good moment to reach out."
- "Let's keep it simple today. One small win is enough."
- "Take a notebook and write down what's on your mind. Just a few lines."
- "You don't need to figure it all out right now. Start with one thing."
- Practical: "Try box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4. Repeat 4 rounds. It activates your parasympathetic nervous system and brings your heart rate down quickly."
- Recipe: "A simple high-protein breakfast: two eggs scrambled with spinach and half an avocado on whole grain toast. Takes 5 minutes, keeps you full for hours."`;

const MEMORY_ADDENDUM = `

PERSISTENT MEMORY (across conversations):
You can quietly remember long-term facts the user shares — preferences, goals, routines, relationships, health context, work, calendar habits, interests. Use these memories ONLY when relevant. Never list them back unprompted. Never invent memories.

EXTRACTING NEW MEMORIES:
If — and only if — the user's latest message contains information that is clearly worth remembering long-term (not a passing mood, not a one-off question, not small talk), include AT THE VERY END of your reply a single fenced block:

\`\`\`vyv-memory
[{"content":"Likes surfing at sunrise","memory_type":"interest","importance_score":7}]
\`\`\`

Rules:
- Array of 1-3 short memory objects. Skip the block entirely if nothing is worth saving.
- memory_type ∈ preference|goal|routine|relationship|health|work|calendar|interest|other.
- importance_score is 1-10 (10 = core identity, 5 = useful, 1 = trivial).
- content is one short factual sentence in English, written about the user in third person ("User wants to lower body fat"). Do NOT store raw quotes, emotions of the moment, or anything sensitive the user did not explicitly share.
- Never mention the block, never explain it, never reference "memory" in the human-facing part of your reply.
`;

const CALENDAR_ADDENDUM = `

CALENDAR ACCESS (the user has explicitly granted permission):
You can see the user's upcoming calendar events below as JSON. Use them to:
- Summarize their day briefly.
- Suggest better time blocks for focus, rest, gym, errands, social, wellness.
- Detect overloaded days and suggest what to shorten or move.
- Help them create, move, or delete events from natural language.

STRICT CALENDAR RULES:
1. NEVER claim you changed, added, moved, or deleted anything. You can only PROPOSE changes — the user confirms inside the app.
2. When the user asks to add, move, or delete an event, reply with a SHORT confirmation question AND a single fenced proposal block on its own lines:

\`\`\`vyv-proposal
{"action":"create","title":"Gym","starts_at":"2026-06-07T19:00:00-05:00","ends_at":"2026-06-07T20:00:00-05:00","category":"sport"}
\`\`\`

Allowed actions: "create", "update", "delete".
- create: requires title, starts_at, ends_at, category. category ∈ work|sport|nutrition|rest|social|wellness|personal.
- update: requires event_id, plus any of starts_at, ends_at, title, category.
- delete: requires event_id.
Use ISO 8601 with the user's timezone offset. Keep titles to 1-3 words.
3. Only ONE proposal block per reply. Multiple changes → ask which one first.
4. If something is ambiguous (no date, no time), ask one clarifying question instead of guessing.
5. Be brief — one sentence above the block.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, calendarAccess } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = BASE_SYSTEM_PROMPT;
    let calendarSnapshot: any = null;
    let userId: string | null = null;
    let memoryEnabled = true;
    let admin: ReturnType<typeof createClient> | null = null;

    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (jwt) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        admin = createClient(supabaseUrl, serviceKey);
        const { data: userData } = await admin.auth.getUser(jwt);
        userId = userData?.user?.id ?? null;

        if (userId) {
          const { data: profile } = await admin
            .from("profiles")
            .select(
              "ai_calendar_access_enabled, ai_memory_enabled, current_timezone, home_timezone"
            )
            .eq("user_id", userId)
            .maybeSingle();
          memoryEnabled = (profile as any)?.ai_memory_enabled !== false;

          // Memory injection
          if (memoryEnabled) {
            systemPrompt = systemPrompt + MEMORY_ADDENDUM;
            const { data: memories } = await admin
              .from("ai_memories")
              .select("content, memory_type, importance_score")
              .eq("user_id", userId)
              .order("importance_score", { ascending: false })
              .order("last_accessed_at", { ascending: false })
              .limit(40);
            if (memories && memories.length) {
              const lines = (memories as any[])
                .map(
                  (m) =>
                    `- [${m.memory_type}, ${m.importance_score}/10] ${m.content}`
                )
                .join("\n");
              systemPrompt += `\n\nUSER MEMORIES (use only when relevant, never recite):\n${lines}`;
              // touch last_accessed_at (fire & forget)
              admin
                .from("ai_memories")
                .update({ last_accessed_at: new Date().toISOString() })
                .eq("user_id", userId)
                .then(() => {})
                .catch(() => {});
            }
          }

          // Calendar injection
          if (calendarAccess && (profile as any)?.ai_calendar_access_enabled) {
            const now = new Date();
            const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const tz =
              (profile as any).current_timezone ||
              (profile as any).home_timezone ||
              "UTC";

            // Compute "today" in user's timezone (YYYY-MM-DD)
            const todayKey = new Intl.DateTimeFormat("en-CA", {
              timeZone: tz,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(now);
            const startOfTodayUtc = new Date(
              new Date(`${todayKey}T00:00:00`).toLocaleString("en-US", {
                timeZone: tz,
              })
            );
            // Fallback: just use start-of-day UTC if conversion fails
            const todayStartIso = isNaN(startOfTodayUtc.getTime())
              ? new Date(now.toISOString().slice(0, 10) + "T00:00:00Z").toISOString()
              : startOfTodayUtc.toISOString();
            const tomorrowStartIso = new Date(
              new Date(todayStartIso).getTime() + 24 * 60 * 60 * 1000
            ).toISOString();

            // Run all reads in parallel
            const [
              eventsRes,
              todayEventsRes,
              healthRes,
              workoutsRes,
              timeUsageRes,
              entriesRes,
              habitLogsRes,
              habitsRes,
            ] = await Promise.all([
              admin
                .from("calendar_events")
                .select("id, title, category, starts_at, ends_at")
                .eq("user_id", userId)
                .gte("starts_at", now.toISOString())
                .lte("starts_at", horizon.toISOString())
                .order("starts_at", { ascending: true })
                .limit(60),
              admin
                .from("calendar_events")
                .select("id, title, category, starts_at, ends_at")
                .eq("user_id", userId)
                .gte("starts_at", todayStartIso)
                .lt("starts_at", tomorrowStartIso)
                .order("starts_at", { ascending: true })
                .limit(50),
              admin
                .from("health_daily")
                .select(
                  "date, steps, workout_minutes, sleep_minutes, active_calories, distance_km, resistance_volume"
                )
                .eq("user_id", userId)
                .eq("date", todayKey)
                .maybeSingle(),
              admin
                .from("workout_sessions")
                .select("type, started_at, minutes, rpe, notes")
                .eq("user_id", userId)
                .gte("started_at", todayStartIso)
                .lt("started_at", tomorrowStartIso)
                .order("started_at", { ascending: true }),
              admin
                .from("time_usage")
                .select("module, seconds_used")
                .eq("user_id", userId)
                .eq("date", todayKey),
              admin
                .from("entries")
                .select("id, mood, caption, occurred_at")
                .eq("user_id", userId)
                .gte("occurred_at", todayStartIso)
                .lt("occurred_at", tomorrowStartIso)
                .order("occurred_at", { ascending: false })
                .limit(20),
              admin
                .from("habit_logs")
                .select("habit_id, completed_at")
                .eq("user_id", userId)
                .gte("completed_at", todayStartIso)
                .lt("completed_at", tomorrowStartIso),
              admin.from("habits").select("id, title").eq("user_id", userId),
            ]);

            const habitsMap = new Map(
              ((habitsRes.data as any[]) || []).map((h) => [h.id, h.title])
            );
            const habitsDone = ((habitLogsRes.data as any[]) || []).map((l) => ({
              title: habitsMap.get(l.habit_id) || "habit",
              at: l.completed_at,
            }));

            const screenTimeByModule: Record<string, number> = {};
            for (const u of ((timeUsageRes.data as any[]) || [])) {
              screenTimeByModule[u.module] = Math.round((u.seconds_used || 0) / 60);
            }
            const totalScreenMin = Object.values(screenTimeByModule).reduce(
              (a, b) => a + b,
              0
            );

            const workoutMinFromSessions = ((workoutsRes.data as any[]) || []).reduce(
              (a, s) => a + (s.minutes || 0),
              0
            );

            const todaySnapshot = {
              date: todayKey,
              timezone: tz,
              now: now.toISOString(),
              events_today: todayEventsRes.data || [],
              health: {
                steps: (healthRes.data as any)?.steps || 0,
                workout_minutes:
                  workoutMinFromSessions ||
                  (healthRes.data as any)?.workout_minutes ||
                  0,
                sleep_minutes: (healthRes.data as any)?.sleep_minutes || 0,
                active_calories: (healthRes.data as any)?.active_calories || 0,
                distance_km: (healthRes.data as any)?.distance_km || 0,
              },
              workout_sessions: workoutsRes.data || [],
              screen_time: {
                total_minutes: totalScreenMin,
                by_module: screenTimeByModule,
              },
              captures_today: ((entriesRes.data as any[]) || []).map((e) => ({
                id: e.id,
                mood: e.mood,
                caption: e.caption,
                at: e.occurred_at,
              })),
              habits_completed: habitsDone,
            };

            calendarSnapshot = {
              now: now.toISOString(),
              timezone: tz,
              events: eventsRes.data || [],
            };

            systemPrompt +=
              CALENDAR_ADDENDUM +
              `\n\nTODAY SNAPSHOT (live from the user's profile / activity calendar — refer to it when answering "how was my day", "what did I do today", "should I work out", or any time-aware question):\n${JSON.stringify(
                todaySnapshot
              )}` +
              `\n\nUPCOMING CALENDAR (next 7 days):\n${JSON.stringify(
                calendarSnapshot
              )}`;
          }
          }
        }
      } catch (e) {
        console.error("context error", e);
      }
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-6), // keep context small — last 6 messages only
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Take a breath and try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee stream: pass chunks through, accumulate full assistant text, then on flush
    // parse ```vyv-memory blocks and persist via service role.
    let assembled = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const persistMemories = async (full: string) => {
      if (!admin || !userId || !memoryEnabled) return;
      const match = full.match(/```vyv-memory\s*([\s\S]*?)```/i);
      if (!match) return;
      try {
        const parsed = JSON.parse(match[1].trim());
        if (!Array.isArray(parsed)) return;
        const rows = parsed
          .filter((m) => m && typeof m.content === "string" && m.content.trim())
          .slice(0, 3)
          .map((m) => ({
            user_id: userId!,
            content: String(m.content).trim().slice(0, 500),
            memory_type: [
              "preference",
              "goal",
              "routine",
              "relationship",
              "health",
              "work",
              "calendar",
              "interest",
              "other",
            ].includes(m.memory_type)
              ? m.memory_type
              : "other",
            importance_score: Math.max(
              1,
              Math.min(10, parseInt(m.importance_score, 10) || 5)
            ),
          }));
        if (!rows.length) return;
        await admin.from("ai_memories").insert(rows);
      } catch (e) {
        console.error("memory parse error", e);
      }
    };

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        try {
          const text = decoder.decode(chunk, { stream: true });
          // Extract delta.content out of SSE lines
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const json = trimmed.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (typeof c === "string") assembled += c;
            } catch {
              // partial JSON; ignore
            }
          }
        } catch {
          // ignore
        }
      },
      async flush() {
        await persistMemories(assembled);
      },
    });

    return new Response(response.body!.pipeThrough(transform), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("vyv-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
