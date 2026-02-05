import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HealthSignals {
  sleepHours: number;
  steps: number;
  workoutMinutes: number;
  activeCalories: number;
}

interface CalendarContext {
  totalEvents: number;
  meetingMinutes: number;
  hasBackToBack: boolean;
  nextEventIn: number | null; // minutes
  eventTitles: string[];
}

interface WatchNotification {
  notification_type: "focus" | "recovery" | "transition" | "calendar";
  title: string;
  body: string;
  context_signals: {
    stress_level: "low" | "moderate" | "high";
    energy_level: "low" | "moderate" | "high";
    calendar_load: "light" | "moderate" | "heavy";
    reasoning: string;
  };
}

function buildSystemPrompt(language: string): string {
  const langInstruction =
    language === "es"
      ? "IDIOMA OBLIGATORIO: Responde EXCLUSIVAMENTE en español."
      : "MANDATORY LANGUAGE: Respond EXCLUSIVELY in English.";

  return `You are VYV's intelligent notification engine for smartwatches. You generate calm, minimal, contextual notifications that act as gentle guidance — never commands or alerts.

${langInstruction}

ROLE: Analyze the user's health signals and calendar context to determine the most appropriate notification(s) for right now. You are a wellness companion, not a fitness tracker.

NOTIFICATION TYPES (choose 1-3 maximum):
- "focus": When energy is stable and conditions favor deep work. Calm invitation to begin.
- "recovery": When stress is high, sleep was poor, or physical strain is elevated. Prioritize rest.
- "transition": When a focus block ends or a context shift is detected. Gentle pause suggestion.
- "calendar": When upcoming schedule is demanding. Protect energy message.

STRICT RULES:
1. Maximum 3 notifications per generation. Prefer fewer.
2. Recovery ALWAYS overrides focus if stress is high or sleep was poor.
3. NEVER show numbers, metrics, charts, or raw health data.
4. NEVER use urgent, aggressive, or commanding language.
5. Messages must be SHORT: title ≤ 8 words, body ≤ 10 words.
6. Tone: calm, supportive, elegant, premium. Like a thoughtful friend, not a coach.
7. No emojis. No exclamation marks.
8. Each notification must feel like quiet guidance.

STRESS INFERENCE RULES:
- Poor sleep (<6h) + high activity = HIGH stress
- Poor sleep (<6h) alone = MODERATE stress
- Good sleep (>7h) + moderate activity = LOW stress
- Many meetings (>3h) = calendar load HEAVY
- Back-to-back meetings = calendar load HEAVY

ENERGY INFERENCE RULES:
- Good sleep (>7h) + low/moderate activity = HIGH energy
- Moderate sleep (6-7h) = MODERATE energy
- Poor sleep (<6h) or high workout load = LOW energy

OUTPUT FORMAT (strict JSON array):
[
  {
    "notification_type": "focus",
    "title": "Your energy is aligned",
    "body": "A focused session awaits",
    "context_signals": {
      "stress_level": "low",
      "energy_level": "high",
      "calendar_load": "light",
      "reasoning": "Brief one-sentence explanation of why this notification was chosen"
    }
  }
]`;
}

function buildUserPrompt(
  health: HealthSignals,
  calendar: CalendarContext,
  existingToday: number
): string {
  return `CURRENT USER CONTEXT:

Health Signals:
- Sleep last night: ${health.sleepHours > 0 ? health.sleepHours + " hours" : "No data available"}
- Steps today: ${health.steps > 0 ? health.steps : "No data available"}
- Workout minutes today: ${health.workoutMinutes > 0 ? health.workoutMinutes + " min" : "No data available"}
- Active calories: ${health.activeCalories > 0 ? health.activeCalories : "No data available"}

Calendar Context:
- Events today: ${calendar.totalEvents}
- Total meeting time: ${calendar.meetingMinutes > 0 ? calendar.meetingMinutes + " min" : "None scheduled"}
- Back-to-back meetings: ${calendar.hasBackToBack ? "Yes" : "No"}
- Next event in: ${calendar.nextEventIn !== null ? calendar.nextEventIn + " minutes" : "No upcoming events"}
- Event names: ${calendar.eventTitles.length > 0 ? calendar.eventTitles.join(", ") : "None"}

Notifications already sent today: ${existingToday}
Maximum allowed today: 5

Generate the most appropriate notification(s) for this moment. Remember: fewer is better. If ${existingToday} >= 4, generate at most 1. If ${existingToday} >= 5, generate 0 and return an empty array [].`;
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse optional language from body
    let userLanguage = "en";
    try {
      const body = await req.json();
      userLanguage = body?.language || "en";
    } catch {
      // No body, default language
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Gather health signals
    const { data: healthData } = await supabase
      .from("health_daily")
      .select("steps, workout_minutes, active_calories")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    // We don't have a sleep_hours column in health_daily, so infer from previous day's data
    // or use a default. Check yesterday for activity as proxy.
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdayHealth } = await supabase
      .from("health_daily")
      .select("workout_minutes, steps")
      .eq("user_id", userId)
      .eq("date", yesterdayStr)
      .single();

    // Infer sleep quality from yesterday's activity (heuristic)
    const sleepHours = yesterdayHealth
      ? yesterdayHealth.workout_minutes > 60
        ? 6 // heavy workout day → likely disrupted sleep
        : 7.5 // normal day → assume decent sleep
      : 7; // no data → assume average

    const healthSignals: HealthSignals = {
      sleepHours,
      steps: healthData?.steps || 0,
      workoutMinutes: healthData?.workout_minutes || 0,
      activeCalories: healthData?.active_calories || 0,
    };

    // Gather calendar context
    const { data: events } = await supabase
      .from("calendar_events")
      .select("title, starts_at, ends_at, category")
      .eq("user_id", userId)
      .gte("starts_at", `${today}T00:00:00`)
      .lte("starts_at", `${today}T23:59:59`)
      .order("starts_at");

    let meetingMinutes = 0;
    let hasBackToBack = false;
    let nextEventIn: number | null = null;
    const eventTitles: string[] = [];

    if (events && events.length > 0) {
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        eventTitles.push(ev.title);
        const start = new Date(ev.starts_at);
        const end = new Date(ev.ends_at);
        meetingMinutes += (end.getTime() - start.getTime()) / 60000;

        // Check back-to-back
        if (i > 0) {
          const prevEnd = new Date(events[i - 1].ends_at);
          if (start.getTime() - prevEnd.getTime() < 15 * 60000) {
            hasBackToBack = true;
          }
        }

        // Next event from now
        const minsUntil = (start.getTime() - now.getTime()) / 60000;
        if (minsUntil > 0 && nextEventIn === null) {
          nextEventIn = Math.round(minsUntil);
        }
      }
    }

    const calendarContext: CalendarContext = {
      totalEvents: events?.length || 0,
      meetingMinutes: Math.round(meetingMinutes),
      hasBackToBack,
      nextEventIn,
      eventTitles: eventTitles.slice(0, 5),
    };

    // Count existing notifications today
    const { count: todayCount } = await supabase
      .from("watch_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("generated_at", `${today}T00:00:00`);

    const existingToday = todayCount || 0;

    if (existingToday >= 5) {
      return new Response(
        JSON.stringify({
          notifications: [],
          message: "Daily notification limit reached",
          todayCount: existingToday,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate notifications using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
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
            { role: "system", content: buildSystemPrompt(userLanguage) },
            {
              role: "user",
              content: buildUserPrompt(healthSignals, calendarContext, existingToday),
            },
          ],
          temperature: 0.6,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway request failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let notifications: WatchNotification[] = [];
    try {
      let jsonStr = content;
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      notifications = JSON.parse(jsonStr.trim());

      if (!Array.isArray(notifications)) {
        notifications = [notifications];
      }

      // Enforce max 3 per generation, and daily cap
      const remaining = 5 - existingToday;
      notifications = notifications.slice(0, Math.min(3, remaining));
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: generate a single contextual notification based on heuristics
      const stressLevel =
        sleepHours < 6 ? "high" : sleepHours < 7 ? "moderate" : "low";
      const energyLevel =
        sleepHours >= 7 && (healthSignals.workoutMinutes || 0) < 60
          ? "high"
          : "moderate";

      const type =
        stressLevel === "high"
          ? "recovery"
          : calendarContext.meetingMinutes > 180
          ? "calendar"
          : "focus";

      const fallbackMessages: Record<string, { title: string; body: string }> = {
        recovery: {
          title: userLanguage === "es" ? "Tu cuerpo necesita calma" : "Your body needs calm",
          body:
            userLanguage === "es"
              ? "Elige un ritmo más suave hoy"
              : "Choose a gentler pace today",
        },
        calendar: {
          title:
            userLanguage === "es"
              ? "Día de reuniones por delante"
              : "Meeting-heavy day ahead",
          body:
            userLanguage === "es" ? "Protege tu energía" : "Protect your energy",
        },
        focus: {
          title:
            userLanguage === "es"
              ? "Tu energía está alineada"
              : "Your energy is aligned",
          body:
            userLanguage === "es"
              ? "Un buen momento para enfocarte"
              : "A good moment to focus",
        },
      };

      notifications = [
        {
          notification_type: type,
          title: fallbackMessages[type].title,
          body: fallbackMessages[type].body,
          context_signals: {
            stress_level: stressLevel,
            energy_level: energyLevel,
            calendar_load:
              calendarContext.meetingMinutes > 180
                ? "heavy"
                : calendarContext.meetingMinutes > 90
                ? "moderate"
                : "light",
            reasoning: "Generated from heuristic fallback due to AI parse error",
          },
        },
      ];
    }

    // Store notifications in database
    const insertData = notifications.map((n) => ({
      user_id: userId,
      notification_type: n.notification_type,
      title: n.title,
      body: n.body,
      context_signals: n.context_signals,
    }));

    if (insertData.length > 0) {
      // Use service role to insert (bypasses RLS)
      const { error: insertError } = await supabase
        .from("watch_notifications")
        .insert(insertData);

      if (insertError) {
        console.error("Error storing notifications:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        notifications,
        todayCount: existingToday + notifications.length,
        signals: {
          health: {
            sleepHours: healthSignals.sleepHours,
            hasActivityData: healthSignals.steps > 0 || healthSignals.workoutMinutes > 0,
          },
          calendar: {
            eventCount: calendarContext.totalEvents,
            load:
              calendarContext.meetingMinutes > 180
                ? "heavy"
                : calendarContext.meetingMinutes > 90
                ? "moderate"
                : "light",
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating watch notifications:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
