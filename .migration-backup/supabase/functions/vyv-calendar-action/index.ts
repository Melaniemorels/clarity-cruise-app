import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_CATEGORIES = new Set([
  "work",
  "sport",
  "nutrition",
  "rest",
  "social",
  "wellness",
  "personal",
]);

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (!jwt) return bad(401, "Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return bad(401, "Unauthorized");
    const userId = userData.user.id;

    // Re-check permission server-side
    const { data: profile } = await admin
      .from("profiles")
      .select("ai_calendar_access_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile || !(profile as any).ai_calendar_access_enabled) {
      return bad(403, "Calendar access not granted for VYV Guide");
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return bad(400, "Invalid body");

    const { action, payload, prompt } = body as {
      action: "create" | "update" | "delete";
      payload: any;
      prompt?: string;
    };

    if (!["create", "update", "delete"].includes(action)) {
      return bad(400, "Invalid action");
    }

    let before: any = null;
    let after: any = null;
    let eventId: string | null = null;

    if (action === "create") {
      const { title, starts_at, ends_at, category, notes } = payload || {};
      if (!title || !starts_at || !ends_at || !category) {
        return bad(400, "Missing fields");
      }
      if (!ALLOWED_CATEGORIES.has(String(category))) {
        return bad(400, "Invalid category");
      }
      if (new Date(ends_at) <= new Date(starts_at)) {
        return bad(400, "ends_at must be after starts_at");
      }
      const { data, error } = await admin
        .from("calendar_events")
        .insert({
          user_id: userId,
          title: String(title).slice(0, 120),
          starts_at,
          ends_at,
          category,
          notes: notes ? String(notes).slice(0, 500) : null,
          source: "ai_assistant",
        })
        .select()
        .single();
      if (error) return bad(500, error.message);
      after = data;
      eventId = data.id;
    } else if (action === "update") {
      const { event_id, title, starts_at, ends_at, category, notes } =
        payload || {};
      if (!event_id) return bad(400, "event_id required");
      const { data: existing } = await admin
        .from("calendar_events")
        .select("*")
        .eq("id", event_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) return bad(404, "Event not found");
      before = existing;
      const updates: Record<string, any> = {};
      if (title) updates.title = String(title).slice(0, 120);
      if (starts_at) updates.starts_at = starts_at;
      if (ends_at) updates.ends_at = ends_at;
      if (category) {
        if (!ALLOWED_CATEGORIES.has(String(category)))
          return bad(400, "Invalid category");
        updates.category = category;
      }
      if (notes !== undefined)
        updates.notes = notes ? String(notes).slice(0, 500) : null;
      const finalStart = updates.starts_at || existing.starts_at;
      const finalEnd = updates.ends_at || existing.ends_at;
      if (new Date(finalEnd) <= new Date(finalStart)) {
        return bad(400, "ends_at must be after starts_at");
      }
      const { data, error } = await admin
        .from("calendar_events")
        .update(updates)
        .eq("id", event_id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) return bad(500, error.message);
      after = data;
      eventId = data.id;
    } else {
      // delete
      const { event_id } = payload || {};
      if (!event_id) return bad(400, "event_id required");
      const { data: existing } = await admin
        .from("calendar_events")
        .select("*")
        .eq("id", event_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) return bad(404, "Event not found");
      before = existing;
      const { error } = await admin
        .from("calendar_events")
        .delete()
        .eq("id", event_id)
        .eq("user_id", userId);
      if (error) return bad(500, error.message);
      eventId = event_id;
    }

    // Audit log (best-effort)
    await admin.from("ai_calendar_audit").insert({
      user_id: userId,
      action,
      event_id: eventId,
      before,
      after,
      prompt: prompt ? String(prompt).slice(0, 500) : null,
    });

    return new Response(
      JSON.stringify({ ok: true, event: after, eventId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("vyv-calendar-action error:", e);
    return bad(500, e instanceof Error ? e.message : "Unknown error");
  }
});