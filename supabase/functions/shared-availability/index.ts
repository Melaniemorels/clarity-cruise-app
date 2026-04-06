import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type IntervalMs = { start: number; end: number };

const MIN_OVERLAP_MS = 30 * 60 * 1000;

function clip(i: IntervalMs, win: IntervalMs): IntervalMs | null {
  const s = Math.max(i.start, win.start);
  const e = Math.min(i.end, win.end);
  if (e <= s) return null;
  return { start: s, end: e };
}

function mergeBusy(raw: IntervalMs[]): IntervalMs[] {
  if (raw.length === 0) return [];
  const sorted = [...raw].sort((a, b) => a.start - b.start);
  const out: IntervalMs[] = [{ ...sorted[0] }];
  for (let k = 1; k < sorted.length; k++) {
    const cur = sorted[k];
    const last = out[out.length - 1];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push({ ...cur });
  }
  return out;
}

function freeInsideWindow(busy: IntervalMs[], win: IntervalMs): IntervalMs[] {
  const merged = mergeBusy(busy);
  const free: IntervalMs[] = [];
  let cursor = win.start;
  for (const b of merged) {
    if (b.start > cursor) free.push({ start: cursor, end: Math.min(b.start, win.end) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= win.end) break;
  }
  if (cursor < win.end) free.push({ start: cursor, end: win.end });
  return free.filter((f) => f.end - f.start >= MIN_OVERLAP_MS);
}

function intersectFree(a: IntervalMs[], b: IntervalMs[]): IntervalMs[] {
  const out: IntervalMs[] = [];
  for (const x of a) {
    for (const y of b) {
      const s = Math.max(x.start, y.start);
      const e = Math.min(x.end, y.end);
      if (e - s >= MIN_OVERLAP_MS) out.push({ start: s, end: e });
    }
  }
  return mergeBusy(out);
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

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const viewerId = userData.user.id;
    const body = await req.json().catch(() => ({})) as {
      window_start?: string;
      window_end?: string;
    };
    const windowStartIso = body.window_start;
    const windowEndIso = body.window_end;

    if (!windowStartIso || !windowEndIso) {
      return new Response(JSON.stringify({ error: "window_start and window_end (ISO) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const win: IntervalMs = {
      start: new Date(windowStartIso).getTime(),
      end: new Date(windowEndIso).getTime(),
    };

    if (!Number.isFinite(win.start) || !Number.isFinite(win.end) || win.end <= win.start) {
      return new Response(JSON.stringify({ error: "Invalid window" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxSpan = 26 * 60 * 60 * 1000;
    if (win.end - win.start > maxSpan) {
      return new Response(JSON.stringify({ error: "Window too large" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: viewerPrefs, error: vpErr } = await admin
      .from("availability_sharing")
      .select("share_free_busy_with_friends, show_friend_match_suggestions")
      .eq("user_id", viewerId)
      .maybeSingle();

    if (vpErr) {
      console.error("[shared-availability] viewer prefs", vpErr);
      return new Response(JSON.stringify({ error: "Failed to load preferences" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      !viewerPrefs?.share_free_busy_with_friends ||
      !viewerPrefs?.show_friend_match_suggestions
    ) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: friendships, error: fErr } = await admin
      .from("friendships")
      .select("user_one_id, user_two_id, status")
      .eq("status", "accepted")
      .or(`user_one_id.eq.${viewerId},user_two_id.eq.${viewerId}`);

    if (fErr) {
      console.error("[shared-availability] friendships", fErr);
      return new Response(JSON.stringify({ error: "Failed to load friendships" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const friendIds = (friendships ?? [])
      .map((row) => (row.user_one_id === viewerId ? row.user_two_id : row.user_one_id))
      .filter((id): id is string => !!id && id !== viewerId);

    if (friendIds.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: viewerEvents, error: veErr } = await admin
      .from("calendar_events")
      .select("starts_at, ends_at")
      .eq("user_id", viewerId)
      .lt("starts_at", new Date(win.end).toISOString())
      .gt("ends_at", new Date(win.start).toISOString());

    if (veErr) {
      console.error("[shared-availability] viewer events", veErr);
      return new Response(JSON.stringify({ error: "Failed to load calendar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const viewerBusy: IntervalMs[] = (viewerEvents ?? [])
      .map((e) => ({
        start: new Date(e.starts_at).getTime(),
        end: new Date(e.ends_at).getTime(),
      }))
      .map((i) => clip(i, win))
      .filter((x): x is IntervalMs => x !== null);

    const viewerFree = freeInsideWindow(viewerBusy, win);

    const matches: {
      friend_user_id: string;
      friend_name: string | null;
      friend_handle: string | null;
      overlaps: { start: string; end: string }[];
    }[] = [];

    for (const fid of friendIds) {
      const { data: fp, error: fpErr } = await admin
        .from("availability_sharing")
        .select("share_free_busy_with_friends, show_friend_match_suggestions")
        .eq("user_id", fid)
        .maybeSingle();

      if (fpErr || !fp?.share_free_busy_with_friends || !fp?.show_friend_match_suggestions) {
        continue;
      }

      const { data: fev, error: feErr } = await admin
        .from("calendar_events")
        .select("starts_at, ends_at")
        .eq("user_id", fid)
        .lt("starts_at", new Date(win.end).toISOString())
        .gt("ends_at", new Date(win.start).toISOString());

      if (feErr) {
        console.error("[shared-availability] friend events", feErr);
        continue;
      }

      const friendBusy: IntervalMs[] = (fev ?? [])
        .map((e) => ({
          start: new Date(e.starts_at).getTime(),
          end: new Date(e.ends_at).getTime(),
        }))
        .map((i) => clip(i, win))
        .filter((x): x is IntervalMs => x !== null);

      const friendFree = freeInsideWindow(friendBusy, win);
      const overlaps = intersectFree(viewerFree, friendFree);

      if (overlaps.length === 0) continue;

      const { data: prof } = await admin
        .from("profiles")
        .select("name, handle")
        .eq("user_id", fid)
        .maybeSingle();

      matches.push({
        friend_user_id: fid,
        friend_name: prof?.name ?? null,
        friend_handle: prof?.handle ?? null,
        overlaps: overlaps.map((o) => ({
          start: new Date(o.start).toISOString(),
          end: new Date(o.end).toISOString(),
        })),
      });
    }

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[shared-availability]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
