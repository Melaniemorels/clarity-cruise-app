import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseScopeList(scope: string | undefined): string[] {
  if (!scope?.trim()) return [];
  return scope.split(/[\s,]+/).filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Invalid session" }, 401);
    }

    const body = (await req.json()) as {
      code?: string;
      provider?: string;
      redirect_uri?: string;
    };
    const { code, provider, redirect_uri } = body;

    if (!code || typeof code !== "string") {
      return json({ error: "Missing authorization code" }, 400);
    }
    if (!redirect_uri || typeof redirect_uri !== "string") {
      return json({ error: "Missing redirect_uri" }, 400);
    }
    if (provider !== "spotify" && provider !== "youtube") {
      return json({ error: "Invalid provider" }, 400);
    }

    let access_token: string;
    let refresh_token: string | null;
    let expires_in: number;
    let scopes: string[];

    if (provider === "spotify") {
      const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
      const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return json({ error: "Spotify OAuth is not configured on the server" }, 503);
      }

      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) {
        const msg =
          tokenJson.error_description ||
          tokenJson.error ||
          "Spotify token exchange failed";
        return json({ error: String(msg) }, 400);
      }

      access_token = tokenJson.access_token;
      refresh_token = tokenJson.refresh_token ?? null;
      expires_in = Number(tokenJson.expires_in) || 3600;
      scopes = parseScopeList(tokenJson.scope);
    } else {
      const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return json({ error: "Google / YouTube OAuth is not configured on the server" }, 503);
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) {
        const msg =
          tokenJson.error_description ||
          tokenJson.error ||
          "Google token exchange failed";
        return json({ error: String(msg) }, 400);
      }

      access_token = tokenJson.access_token;
      refresh_token = tokenJson.refresh_token ?? null;
      expires_in = Number(tokenJson.expires_in) || 3600;
      scopes = parseScopeList(tokenJson.scope);
    }

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    const now = new Date().toISOString();

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: upsertErr } = await admin.from("media_integrations").upsert(
      {
        user_id: user.id,
        provider,
        access_token,
        refresh_token,
        is_active: true,
        scopes,
        connected_at: now,
        last_sync_at: null,
        token_expires_at: tokenExpiresAt,
        updated_at: now,
      },
      { onConflict: "user_id,provider" },
    );

    if (upsertErr) {
      console.error("[connect-media] upsert", upsertErr);
      return json({ error: "Failed to save connection" }, 500);
    }

    return json({ ok: true, provider });
  } catch (e) {
    console.error("[connect-media]", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
