import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserContext {
  timeOfDay: string;
  todayWorkoutMinutes: number;
  todaySteps: number;
  sleepHours: number;
  upcomingEvents: { title: string; category: string; startsAt: string }[];
  recentMood?: string;
  focusSessionsToday: number;
}

interface TimeBlock {
  period: "morning" | "midday" | "afternoon" | "evening";
  icon: string;
  activities: {
    type: "work" | "movement" | "nutrition" | "rest" | "mindfulness";
    title: string;
    description: string;
    duration?: string;
    icon: string;
  }[];
}

interface PerfectDayResponse {
  greeting: string;
  intention: string;
  blocks: TimeBlock[];
  closing: {
    type: "reflection" | "affirmation";
    text: string;
  };
}

function buildSystemPrompt(context: UserContext): string {
  return `You are an AI assistant inside VYV, a wellness and productivity app. Your role is to create the user's perfect day based on their lifestyle, energy levels, personal and professional goals, and wellbeing preferences.

USER CONTEXT:
- Current time of day: ${context.timeOfDay}
- Today's workout: ${context.todayWorkoutMinutes} minutes completed
- Today's steps: ${context.todaySteps}
- Sleep last night: ${context.sleepHours} hours
- Focus sessions today: ${context.focusSessionsToday}
- Upcoming events: ${context.upcomingEvents.length > 0 ? context.upcomingEvents.map(e => e.title + " (" + e.category + ") at " + e.startsAt).join(", ") : "None scheduled"}

STRUCTURE:
Organize the day into 4 clear time blocks: morning, midday, afternoon, evening.

For each block, include a balanced combination of:
- Focused work or study
- Physical activity or movement
- Conscious nutrition
- Rest and recovery
- Personal reflection or mindfulness

GUIDELINES:
- The day should feel structured but flexible, never overwhelming
- Prioritize sustainable habits and mental clarity
- Adapt suggestions to support productivity, creativity, and emotional balance
- Avoid rigid schedules; focus on flow and intention
- Use a clear, calm, and motivating tone
- If user has low sleep, suggest gentler activities and more rest
- If user already worked out, focus on recovery and stretching

ACTIVITY TYPE ICONS (use exactly these):
- work: "💼"
- movement: "🏃"
- nutrition: "🥗"
- rest: "😴"
- mindfulness: "🧘"

PERIOD ICONS:
- morning: "🌅"
- midday: "☀️"
- afternoon: "🌤️"
- evening: "🌙"

CLOSING:
End the day with either:
- A short reflective question aligned with personal growth, OR
- A positive affirmation aligned with self-confidence

OUTPUT FORMAT (strict JSON):
{
  "greeting": "Short personalized greeting based on time of day and context",
  "intention": "One sentence setting the day's intention with calm, motivating tone",
  "blocks": [
    {
      "period": "morning",
      "icon": "🌅",
      "activities": [
        {
          "type": "mindfulness",
          "title": "Morning Clarity",
          "description": "Start with 5 minutes of deep breathing to center yourself",
          "duration": "5 min",
          "icon": "🧘"
        }
      ]
    }
  ],
  "closing": {
    "type": "reflection",
    "text": "The question or affirmation text"
  }
}`;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather user context
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const hour = now.getUTCHours();
    
    let timeOfDay = "morning";
    if (hour >= 12 && hour < 14) timeOfDay = "midday";
    else if (hour >= 14 && hour < 18) timeOfDay = "afternoon";
    else if (hour >= 18) timeOfDay = "evening";

    // Get health data
    const { data: healthData } = await supabase
      .from("health_daily")
      .select("steps, workout_minutes, sleep_hours")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    // Get today's events
    const { data: events } = await supabase
      .from("calendar_events")
      .select("title, category, starts_at")
      .eq("user_id", user.id)
      .gte("starts_at", `${today}T00:00:00`)
      .lte("starts_at", `${today}T23:59:59`)
      .order("starts_at");

    // Get focus sessions
    const { data: scheduleBlocks } = await supabase
      .from("schedule_blocks")
      .select("id")
      .eq("user_id", user.id)
      .gte("start_at", `${today}T00:00:00`)
      .lte("start_at", `${today}T23:59:59`);

    const context: UserContext = {
      timeOfDay,
      todayWorkoutMinutes: healthData?.workout_minutes || 0,
      todaySteps: healthData?.steps || 0,
      sleepHours: healthData?.sleep_hours || 7,
      upcomingEvents: events?.map(e => ({
        title: e.title,
        category: e.category,
        startsAt: new Date(e.starts_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      })) || [],
      focusSessionsToday: scheduleBlocks?.length || 0,
    };

    // Generate perfect day using AI
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
          { role: "system", content: buildSystemPrompt(context) },
          { 
            role: "user", 
            content: "Generate my perfect day plan based on my current context. Make it feel supportive and achievable, not overwhelming."
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
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
      throw new Error("Failed to generate perfect day");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    let perfectDay: PerfectDayResponse;
    try {
      let jsonStr = content;
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      perfectDay = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback response
      perfectDay = {
        greeting: "Good day! 🌟",
        intention: "Today is an opportunity to move with purpose and rest with intention.",
        blocks: [
          {
            period: "morning",
            icon: "🌅",
            activities: [
              { type: "mindfulness", title: "Morning Stillness", description: "5 minutes of deep breathing", duration: "5 min", icon: "🧘" },
              { type: "nutrition", title: "Nourishing Breakfast", description: "A balanced meal to fuel your morning", duration: "20 min", icon: "🥗" },
            ],
          },
          {
            period: "midday",
            icon: "☀️",
            activities: [
              { type: "work", title: "Deep Focus Block", description: "Your most important task of the day", duration: "90 min", icon: "💼" },
              { type: "movement", title: "Movement Break", description: "A short walk or stretching", duration: "15 min", icon: "🏃" },
            ],
          },
          {
            period: "afternoon",
            icon: "🌤️",
            activities: [
              { type: "work", title: "Creative Work", description: "Tasks that benefit from relaxed focus", duration: "60 min", icon: "💼" },
              { type: "rest", title: "Mindful Pause", description: "A moment to reset and recharge", duration: "10 min", icon: "😴" },
            ],
          },
          {
            period: "evening",
            icon: "🌙",
            activities: [
              { type: "nutrition", title: "Evening Nourishment", description: "A light, satisfying dinner", duration: "30 min", icon: "🥗" },
              { type: "mindfulness", title: "Gratitude Reflection", description: "Note three things you're grateful for", duration: "5 min", icon: "🧘" },
            ],
          },
        ],
        closing: {
          type: "reflection",
          text: "What moment today brought you the most peace?",
        },
      };
    }

    return new Response(JSON.stringify({
      ...perfectDay,
      generatedAt: new Date().toISOString(),
      context,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating perfect day:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
