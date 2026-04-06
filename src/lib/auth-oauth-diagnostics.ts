/**
 * Development-only helpers for Supabase OAuth (Google / Apple).
 * No UI impact — console diagnostics and one-time setup checklist.
 */

let checklistLogged = false;

/** Project ref from VITE_SUPABASE_URL, e.g. ihmigjoaxuwiriiqkesk */
export function getSupabaseProjectRef(): string | null {
  try {
    const u = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!u) return null;
    const host = new URL(u).hostname;
    if (!host.endsWith(".supabase.co")) return null;
    return host.replace(".supabase.co", "");
  } catch {
    return null;
  }
}

/** Supabase Auth callback URL (Google/Apple must redirect here first, not your app URL). */
export function getSupabaseAuthCallbackUrl(): string | null {
  const ref = getSupabaseProjectRef();
  if (!ref) return null;
  return `https://${ref}.supabase.co/auth/v1/callback`;
}

/**
 * Log once per page load in development: exact external configuration checklist.
 */
export function logOAuthDashboardChecklistOnce(): void {
  if (!import.meta.env.DEV || checklistLogged) return;
  checklistLogged = true;

  const ref = getSupabaseProjectRef();
  const supabaseCallback = getSupabaseAuthCallbackUrl();
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "(browser)";
  const appCallback = `${appOrigin}/auth/callback`;

  console.info(
    "%c[auth] OAuth setup checklist (Supabase + providers)%c\n\n" +
      "— Supabase → Authentication → URL Configuration\n" +
      `  • Site URL: your app origin (e.g. ${appOrigin} for this tab)\n` +
      `  • Redirect URLs: must include exactly: ${appCallback}\n` +
      "    (add production URL + any preview URLs you use)\n\n" +
      "— Supabase → Authentication → Providers → Google\n" +
      "  • Enable; paste OAuth Client ID + Secret from Google Cloud\n\n" +
      "— Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client\n" +
      "  • Application type: Web application (or appropriate)\n" +
      `  • Authorized redirect URIs: ${supabaseCallback ?? "https://<project-ref>.supabase.co/auth/v1/callback"}\n` +
      "    (must match Supabase; NOT your /auth/callback)\n" +
      "  • Authorized JavaScript origins: your app origins (e.g. http://localhost:8080)\n\n" +
      "— Supabase → Authentication → Providers → Apple\n" +
      "  • Enable; Services ID, Team ID, Key ID, private key (.p8) as per Supabase docs\n\n" +
      "— Apple Developer → Identifiers → Services ID (Sign in with Apple)\n" +
      `  • Return URLs: ${supabaseCallback ?? "https://<project-ref>.supabase.co/auth/v1/callback"}\n` +
      "    (same as Supabase Apple callback)\n\n" +
      (ref ? `Project ref in this build: ${ref}\n` : ""),
    "font-weight:700;color:#38bdf8",
    "color:inherit",
  );
}

function redactCode(value: string | null): string | undefined {
  if (!value) return undefined;
  return `[code present, ${value.length} chars]`;
}

/**
 * Log query + hash params on /auth/callback (redacts raw `code` length only).
 */
export function logCallbackUrlDiagnostics(): void {
  if (!import.meta.env.DEV) return;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const merge = (sp: URLSearchParams) => {
    const o: Record<string, string> = {};
    sp.forEach((v, k) => {
      o[k] = k === "code" ? redactCode(v) ?? v : v;
    });
    return o;
  };

  console.groupCollapsed("[auth callback] URL (dev diagnostic)");
  console.log("href", window.location.href);
  console.log("searchParams", merge(search));
  console.log("hashParams", merge(hash));
  console.log("resolved", {
    error: search.get("error") ?? hash.get("error") ?? undefined,
    error_description: search.get("error_description") ?? hash.get("error_description") ?? undefined,
    code: search.get("code") ? redactCode(search.get("code")) : hash.get("code") ? redactCode(hash.get("code")) : undefined,
    state: search.get("state") ?? hash.get("state") ?? undefined,
  });
  console.groupEnd();
}

export function logGetSessionResultDev(
  label: string,
  session: { user?: { id?: string }; expires_at?: number } | null,
  error: { message: string } | null | undefined,
): void {
  if (!import.meta.env.DEV) return;
  if (error) {
    console.error(`[auth callback] getSession (${label}) error:`, error.message);
    return;
  }
  console.log(`[auth callback] getSession (${label}):`, {
    hasSession: !!session,
    userId: session?.user?.id,
    expires_at: session?.expires_at,
  });
}
