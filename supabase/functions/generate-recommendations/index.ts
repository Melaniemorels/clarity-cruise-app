import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContextSignals {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  recentActivity?: string;
  todayWorkoutMinutes: number;
  todaySteps: number;
  sleepQuality?: string;
  upcomingEvents: string[];
  focusSessionsToday: number;
  userGoal?: string;
}

interface Recommendation {
  type: "playlist" | "podcast" | "ambient" | "guided";
  title: string;
  description: string;
  duration: string;
  mood: string;
  spotifyUri?: string;
  externalUrl?: string;
  tags: string[];
}

function detectTimeOfDay(): ContextSignals["timeOfDay"] {
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function buildSystemPrompt(signals: ContextSignals, language: string): string {
  const langInstruction = language === "es"
    ? `LANGUAGE: You MUST write ALL text (titles, descriptions, tags) in Spanish. Do NOT mix English and Spanish. Proper nouns (e.g. artist names, podcast names) may remain in their original language, but descriptions and tags must be entirely in Spanish.`
    : `LANGUAGE: You MUST write ALL text (titles, descriptions, tags) in English. Do NOT mix languages.`;

  return `You are a wellness-focused AI recommendation engine for VYV, a healthy lifestyle app. Your goal is to suggest media content (music, podcasts, ambient sounds) that supports the user's wellbeing—NOT to maximize engagement or create addiction.

${langInstruction}

CORE PRINCIPLES:
- Prioritize user intent over engagement
- Suggest content that supports their stated or detected goal
- Be honest about limitations
- Respect rest and recovery as valid goals
- Never suggest content designed to manipulate emotions

CONTEXT SIGNALS:
- Time of day: ${signals.timeOfDay}
- Today's workout minutes: ${signals.todayWorkoutMinutes}
- Today's steps: ${signals.todaySteps}
- Focus sessions today: ${signals.focusSessionsToday}
- Upcoming events: ${signals.upcomingEvents.length > 0 ? signals.upcomingEvents.join(", ") : "None"}
${signals.recentActivity ? `- Recent activity: ${signals.recentActivity}` : ""}
${signals.userGoal ? `- USER'S EXPLICIT GOAL: ${signals.userGoal} (PRIORITIZE THIS)` : ""}

RECOMMENDATION RULES:
1. If user specified a goal, that takes priority over auto-detected context
2. Suggest 3-5 recommendations maximum
3. Include variety: at least one music and one non-music option
4. Be specific about why each recommendation fits their context
5. Focus on quality over quantity
6. CRITICAL: You MUST include a real, working URL for EVERY recommendation. Use publicly accessible URLs:
   - For playlists/music: use real Spotify playlist URLs (https://open.spotify.com/playlist/...) or YouTube music URLs
   - For podcasts: use real Spotify show/episode URLs or Apple Podcasts URLs or YouTube channel URLs
   - For ambient sounds: use real YouTube video URLs of ambient/nature sounds
   - For guided content: use real YouTube video URLs of guided meditation, yoga, etc.
   Only recommend content that actually exists and is well-known. Do NOT invent or hallucinate URLs.

OUTPUT FORMAT (JSON array):
[
  {
    "type": "playlist" | "podcast" | "ambient" | "guided",
    "title": "Exact name of the real content",
    "description": "Why this fits their current context (1-2 sentences, in ${language === 'es' ? 'Spanish' : 'English'})",
    "duration": "30 min" | "1 hour" | etc,
    "mood": "calm" | "energizing" | "focused" | "uplifting" | "relaxing",
    "externalUrl": "https://open.spotify.com/playlist/... or https://www.youtube.com/watch?v=...",
    "tags": ["focus", "instrumental", "lo-fi"] // 2-4 tags, in ${language === 'es' ? 'Spanish' : 'English'}
  }
]`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { goal, forceRefresh, language = "en" } = await req.json();

    // Check for cached recommendations (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("media_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .eq("goal", goal || "auto")
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        return new Response(JSON.stringify({
          recommendations: cached.recommendations,
          context: cached.context_type,
          signals: cached.signals_used,
          cached: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather context signals
    const today = new Date().toISOString().split("T")[0];
    
    // Get today's health data
    const { data: healthData } = await supabase
      .from("health_daily")
      .select("steps, workout_minutes")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    // Get today's schedule blocks (focus sessions)
    const { data: scheduleBlocks } = await supabase
      .from("schedule_blocks")
      .select("title, start_at, end_at")
      .eq("user_id", user.id)
      .gte("start_at", `${today}T00:00:00`)
      .lte("start_at", `${today}T23:59:59`);

    // Get upcoming events (next 3 hours)
    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    const { data: upcomingEvents } = await supabase
      .from("calendar_events")
      .select("title, category")
      .eq("user_id", user.id)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", threeHoursLater.toISOString())
      .limit(5);

    const signals: ContextSignals = {
      timeOfDay: detectTimeOfDay(),
      todayWorkoutMinutes: healthData?.workout_minutes || 0,
      todaySteps: healthData?.steps || 0,
      focusSessionsToday: scheduleBlocks?.length || 0,
      upcomingEvents: upcomingEvents?.map(e => `${e.title} (${e.category})`) || [],
      userGoal: goal,
    };

    // Determine context type for storage
    let contextType: string = signals.timeOfDay;
    if (signals.todayWorkoutMinutes > 0 && signals.todayWorkoutMinutes < 60) {
      contextType = "post_workout";
    }

    // Generate recommendations using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: buildSystemPrompt(signals, language) },
          { 
            role: "user", 
            content: goal 
              ? `Generate recommendations for my goal: ${goal}. Consider my current context but prioritize my stated goal. Respond entirely in ${language === 'es' ? 'Spanish' : 'English'}.`
              : `Based on my current context, suggest the best media content for me right now. Auto-detect what would be most helpful. Respond entirely in ${language === 'es' ? 'Spanish' : 'English'}.`
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to generate recommendations");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse AI response - handle markdown code blocks
    let recommendations: Recommendation[] = [];
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      recommendations = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      recommendations = [
        {
          type: "ambient",
          title: language === "es" ? "Sonidos de enfoque" : "Focus Sounds",
          description: language === "es" ? "Sonidos ambientales suaves para ayudarte a concentrarte" : "Gentle ambient sounds to help you concentrate",
          duration: language === "es" ? "Continuo" : "Continuous",
          mood: "focused",
          tags: language === "es" ? ["ambiental", "enfoque", "productividad"] : ["ambient", "focus", "productivity"],
        },
      ];
    }

    // Store recommendations
    await supabase.from("media_recommendations").insert({
      user_id: user.id,
      goal: goal || "auto",
      context_type: contextType,
      recommendations,
      signals_used: signals,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify({
      recommendations,
      context: contextType,
      signals,
      cached: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating recommendations:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});