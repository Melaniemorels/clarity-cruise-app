import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANNED_PATTERNS = [
  // Spanish profanity
  /\b(puta|puto|mierda|coño|verga|pendej[oa]|cabr[oó]n|chinga|joder|malpar[iy]d[oa]|hijueputa|gonorrea|culo)\b/gi,
  // English profanity
  /\b(fuck|shit|bitch|asshole|dick|cock|cunt|nigger|faggot|retard|whore|slut)\b/gi,
  // Hate speech patterns
  /\b(kill\s+(yourself|urself)|kys|die\s+already)\b/gi,
];

function moderateText(text: string): {
  flagged: boolean;
  violations: string[];
  confidence: number;
} {
  if (!text || text.trim().length === 0) {
    return { flagged: false, violations: [], confidence: 1.0 };
  }

  const violations: string[] = [];
  const normalized = text.toLowerCase();

  for (const pattern of BANNED_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(normalized)) {
      violations.push("offensive_text");
      break;
    }
  }

  return {
    flagged: violations.length > 0,
    violations,
    confidence: violations.length > 0 ? 0.95 : 0,
  };
}

async function moderateImage(
  imageUrl: string,
  apiKey: string
): Promise<{ flagged: boolean; violations: string[]; confidence: number }> {
  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a content moderation system. Analyze the image and determine if it violates community guidelines.

Check for:
1. NSFW/nudity/sexually explicit content
2. Graphic violence or gore
3. Drug use or drug paraphernalia
4. Hate symbols or extremist content
5. Self-harm or suicide content

Respond ONLY with JSON:
{
  "safe": true/false,
  "violations": ["nsfw_image", "violence", "drugs", "hate_content", "self_harm"],
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}

If the image is safe, respond: {"safe": true, "violations": [], "confidence": 1.0, "reason": "safe content"}`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Moderate this image:" },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("AI moderation error:", response.status);
      // Fail open - allow content if AI is unavailable
      return { flagged: false, violations: [], confidence: 0 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        flagged: !result.safe,
        violations: result.violations || [],
        confidence: result.confidence || 0.5,
      };
    }

    return { flagged: false, violations: [], confidence: 0 };
  } catch (error) {
    console.error("Image moderation error:", error);
    return { flagged: false, violations: [], confidence: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, imageUrl, userId, contentType } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is already suspended
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_suspended")
      .eq("user_id", userId)
      .single();

    if (profile?.is_suspended) {
      return new Response(
        JSON.stringify({
          approved: false,
          reason: "account_suspended",
          message: "Tu cuenta está suspendida por violaciones repetidas de las normas de la comunidad.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Run text and image moderation in parallel
    const results = await Promise.all([
      text ? moderateText(text) : { flagged: false, violations: [], confidence: 0 },
      imageUrl ? moderateImage(imageUrl, LOVABLE_API_KEY) : { flagged: false, violations: [], confidence: 0 },
    ]);

    const [textResult, imageResult] = results;
    const allViolations = [
      ...textResult.violations,
      ...imageResult.violations,
    ];
    const flagged = textResult.flagged || imageResult.flagged;
    const maxConfidence = Math.max(
      textResult.confidence,
      imageResult.confidence
    );

    if (flagged) {
      // Record the violation
      const violationType = allViolations[0] || "other";
      await supabase.from("content_violations").insert({
        user_id: userId,
        violation_type: violationType,
        content_type: contentType || "post",
        content_reference: text
          ? text.substring(0, 100)
          : imageUrl
          ? "image"
          : null,
        severity: "strike",
        ai_confidence: maxConfidence,
      });

      // Count total strikes
      const { count: strikeCount } = await supabase
        .from("content_violations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("severity", "strike");

      const totalStrikes = strikeCount || 0;

      // Suspend after 3 strikes
      if (totalStrikes >= 3) {
        await supabase
          .from("profiles")
          .update({
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspension_reason: `Cuenta suspendida automáticamente tras ${totalStrikes} violaciones de las normas de la comunidad.`,
          })
          .eq("user_id", userId);

        return new Response(
          JSON.stringify({
            approved: false,
            reason: "account_suspended",
            strikes: totalStrikes,
            message:
              "Tu cuenta ha sido suspendida por violaciones repetidas de las normas de la comunidad.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          approved: false,
          reason: violationType,
          strikes: totalStrikes,
          maxStrikes: 3,
          message: `Contenido rechazado: viola las normas de la comunidad. Strike ${totalStrikes}/3.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ approved: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("moderate-content error:", error);
    // Fail open - allow content if moderation system errors
    return new Response(
      JSON.stringify({
        approved: true,
        warning: "Moderation temporarily unavailable",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
