import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are VYV Guide — a calm, grounded wellness and life-guidance presence inside the VYV app.

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

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
            { role: "system", content: SYSTEM_PROMPT },
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

    return new Response(response.body, {
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
