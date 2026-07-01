// Supabase-compatibility shim.
//
// This project was migrated off Supabase onto a Replit pnpm-workspace stack
// (Express + Drizzle + Postgres). This module re-implements the small slice of
// the supabase-js surface the app actually uses, backed by the api-server:
//   - .from(table)         -> POST /api/db/query   (generic Drizzle executor)
//   - .auth.*              -> Clerk (real Google/Apple/email + password reset)
//   - .storage.from(b)     -> /api/storage/*       (object storage)
//   - .functions.invoke()  -> /api/functions/v1/*  (edge-function ports)
//   - .channel()/realtime  -> no-op stubs
//
// Auth transport: authentication is Clerk. The browser sends Clerk's session
// cookie automatically for same-origin `/api` requests; we additionally attach
// a Clerk bearer token (from window.Clerk) so requests authenticate even when
// the API is served from a different origin. The backend's clerkMiddleware
// accepts either. The `user.id` exposed here is this app's stable UUID (fetched
// by AuthContext from /api/auth/me and cached), NOT the raw Clerk id — so every
// `.eq("user_id", user.id)` call keeps working against the UUID-keyed schema.
import type { Session, User } from "@supabase/supabase-js";

const BASE = (import.meta.env.VITE_SUPABASE_URL as string) || "/api";

// Cache of this app's stable identity ({ id: uuid, email }). Written by
// AuthContext after it calls /api/auth/me; read here to shape sessions.
const APP_USER_KEY = "vyv-app-user";

interface AppUser {
  id: string;
  email: string;
}

function loadAppUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(APP_USER_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Clerk bridge
// ---------------------------------------------------------------------------

function getClerk(): any {
  return typeof window !== "undefined" ? (window as any).Clerk ?? null : null;
}

async function clerkToken(): Promise<string | null> {
  try {
    const c = getClerk();
    if (c?.session) return (await c.session.getToken()) ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await clerkToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Auth state change listeners
// ---------------------------------------------------------------------------

type AuthEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED";
type AuthListener = (event: AuthEvent, session: Session | null) => void;

const listeners = new Set<AuthListener>();

function emit(event: AuthEvent, session: Session | null): void {
  listeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch {
      /* ignore */
    }
  });
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

type Filter = { col: string; op: string; val: unknown };

interface QueryResult<T = any> {
  data: T;
  error: { message: string; code?: string } | null;
  count: number | null;
}

class QueryBuilder<T = any> implements PromiseLike<QueryResult<T>> {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" | "upsert" =
    "select";
  private isWrite = false;
  private columns = "*";
  private filters: Filter[] = [];
  private orderList: { col: string; ascending: boolean }[] = [];
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _single = false;
  private _maybeSingle = false;
  private _values: unknown = undefined;
  private _onConflict: string | undefined;
  private _ignoreDuplicates = false;
  private _count: "exact" | null = null;
  private _head = false;
  private _returning = false;

  constructor(table: string) {
    this.table = table;
  }

  select(
    columns = "*",
    opts?: { count?: "exact"; head?: boolean },
  ): this {
    this.columns = columns;
    if (this.isWrite) {
      this._returning = true;
    } else {
      this.action = "select";
      if (opts?.count) this._count = opts.count;
      if (opts?.head) this._head = true;
    }
    return this;
  }

  insert(values: unknown): this {
    this.action = "insert";
    this.isWrite = true;
    this._values = values;
    return this;
  }

  update(values: unknown): this {
    this.action = "update";
    this.isWrite = true;
    this._values = values;
    return this;
  }

  upsert(
    values: unknown,
    opts?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.action = "upsert";
    this.isWrite = true;
    this._values = values;
    this._onConflict = opts?.onConflict;
    this._ignoreDuplicates = opts?.ignoreDuplicates ?? false;
    return this;
  }

  delete(): this {
    this.action = "delete";
    this.isWrite = true;
    return this;
  }

  private addFilter(col: string, op: string, val: unknown): this {
    this.filters.push({ col, op, val });
    return this;
  }

  eq(col: string, val: unknown): this {
    return this.addFilter(col, "eq", val);
  }
  neq(col: string, val: unknown): this {
    return this.addFilter(col, "neq", val);
  }
  gt(col: string, val: unknown): this {
    return this.addFilter(col, "gt", val);
  }
  gte(col: string, val: unknown): this {
    return this.addFilter(col, "gte", val);
  }
  lt(col: string, val: unknown): this {
    return this.addFilter(col, "lt", val);
  }
  lte(col: string, val: unknown): this {
    return this.addFilter(col, "lte", val);
  }
  in(col: string, val: unknown[]): this {
    return this.addFilter(col, "in", val);
  }
  is(col: string, val: unknown): this {
    return this.addFilter(col, "is", val);
  }
  like(col: string, val: string): this {
    return this.addFilter(col, "like", val);
  }
  ilike(col: string, val: string): this {
    return this.addFilter(col, "ilike", val);
  }
  not(col: string, op: string, val: unknown): this {
    return this.addFilter(col, `not_${op}`, val);
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderList.push({ col, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  range(from: number, to: number): this {
    this._offset = from;
    this._limit = to - from + 1;
    return this;
  }

  single(): this {
    this._single = true;
    return this;
  }

  maybeSingle(): this {
    this._maybeSingle = true;
    return this;
  }

  private async run(): Promise<QueryResult<T>> {
    const payload = {
      table: this.table,
      action: this.action,
      columns: this.columns.split(",").map((c) => c.trim()),
      filters: this.filters,
      order: this.orderList,
      limit: this._limit,
      offset: this._offset,
      single: this._single,
      maybeSingle: this._maybeSingle,
      values: this._values,
      onConflict: this._onConflict,
      ignoreDuplicates: this._ignoreDuplicates,
      count: this._count,
      head: this._head,
      returning: this.isWrite ? this._returning : true,
    };
    try {
      const res = await fetch(`${BASE}/db/query`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as QueryResult<T>;
      return {
        data: json.data as T,
        error: json.error ?? null,
        count: json.count ?? null,
      };
    } catch (err) {
      return {
        data: (this._single || this._maybeSingle ? null : []) as T,
        error: { message: err instanceof Error ? err.message : "Network error" },
        count: null,
      };
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function storageFrom(bucket: string) {
  return {
    async upload(
      path: string,
      file: Blob | File,
      _opts?: { cacheControl?: string; upsert?: boolean; contentType?: string },
    ) {
      try {
        const res = await fetch(
          `${BASE}/storage/${bucket}/upload?path=${encodeURIComponent(path)}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                _opts?.contentType || (file as File).type || "application/octet-stream",
              ...(await authHeaders()),
            },
            body: file,
          },
        );
        const json = await res.json();
        if (!res.ok) {
          return { data: null, error: json.error ?? { message: "Upload failed" } };
        }
        return { data: json.data, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : "Upload failed" },
        };
      }
    },
    getPublicUrl(path: string) {
      return {
        data: {
          publicUrl: `${BASE}/storage/${bucket}/serve/${path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
        },
      };
    },
    async remove(paths: string[]) {
      try {
        const res = await fetch(`${BASE}/storage/${bucket}/remove`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ paths }),
        });
        const json = await res.json();
        return { data: json.data ?? null, error: json.error ?? null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : "Remove failed" },
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Auth (bridged to Clerk)
// ---------------------------------------------------------------------------

interface AuthResponse {
  data: { user: User | null; session: Session | null };
  error: { message: string; code?: string } | null;
}

// Build a supabase-shaped session from the live Clerk session. The user id is
// this app's stable UUID (from the /api/auth/me cache) so downstream
// `.eq("user_id", user.id)` calls resolve correctly.
async function buildClerkSession(): Promise<Session | null> {
  const clerk = getClerk();
  if (!clerk?.session) return null;
  const appUser = loadAppUser();
  const token = (await clerkToken()) ?? "";
  const email =
    appUser?.email || clerk.user?.primaryEmailAddress?.emailAddress || "";
  const id = appUser?.id || clerk.user?.id || "";
  const user = {
    id,
    email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  } as unknown as User;
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: token,
    user,
  } as unknown as Session;
}

const auth = {
  async getSession(): Promise<{
    data: { session: Session | null };
    error: null;
  }> {
    return { data: { session: await buildClerkSession() }, error: null };
  },

  async getUser(): Promise<{
    data: { user: User | null };
    error: { message: string } | null;
  }> {
    const session = await buildClerkSession();
    if (!session) {
      return { data: { user: null }, error: { message: "Not authenticated" } };
    }
    return { data: { user: session.user }, error: null };
  },

  onAuthStateChange(cb: AuthListener) {
    listeners.add(cb);
    buildClerkSession().then((s) => cb("INITIAL_SESSION", s));
    return {
      data: {
        subscription: {
          unsubscribe() {
            listeners.delete(cb);
          },
        },
      },
    };
  },

  async signOut(_opts?: { scope?: string }): Promise<{ error: null }> {
    try {
      const c = getClerk();
      if (c) await c.signOut();
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(APP_USER_KEY);
    } catch {
      /* ignore */
    }
    emit("SIGNED_OUT", null);
    return { error: null };
  },

  // Real sign-in / sign-up / OAuth / password reset are handled by Clerk's
  // <SignIn>/<SignUp> components. These legacy methods remain only so unused
  // imported screens still type-check; they should not be reached.
  async signInWithPassword(): Promise<AuthResponse> {
    return {
      data: { user: null, session: null },
      error: { message: "Sign in with Clerk" },
    };
  },

  async signUp(): Promise<AuthResponse> {
    return {
      data: { user: null, session: null },
      error: { message: "Sign up with Clerk" },
    };
  },

  async signInWithOAuth(): Promise<{
    data: null;
    error: { message: string };
  }> {
    return { data: null, error: { message: "Sign in with Clerk" } };
  },

  async setSession(): Promise<AuthResponse> {
    const session = await buildClerkSession();
    return { data: { user: session?.user ?? null, session }, error: null };
  },

  async refreshSession(): Promise<AuthResponse> {
    const session = await buildClerkSession();
    return { data: { user: session?.user ?? null, session }, error: null };
  },

  async updateUser(): Promise<{ data: { user: User | null }; error: null }> {
    const session = await buildClerkSession();
    return { data: { user: session?.user ?? null }, error: null };
  },

  async resend(): Promise<{ data: Record<string, unknown>; error: null }> {
    return { data: {}, error: null };
  },

  async resetPasswordForEmail(): Promise<{
    data: Record<string, unknown>;
    error: null;
  }> {
    return { data: {}, error: null };
  },
};

// ---------------------------------------------------------------------------
// Functions (edge-function ports)
// ---------------------------------------------------------------------------

const functions = {
  async invoke(
    name: string,
    opts?: { body?: unknown },
  ): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      const res = await fetch(`${BASE}/functions/v1/${name}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(opts?.body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          data: null,
          error: { message: data?.error ?? `Function ${name} failed` },
        };
      }
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : "Function failed" },
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Realtime (no-op stubs — realtime is not implemented in this migration)
// ---------------------------------------------------------------------------

interface ChannelStub {
  on: (...args: unknown[]) => ChannelStub;
  subscribe: (cb?: (status: string) => void) => ChannelStub;
  unsubscribe: () => Promise<"ok">;
}

function channel(_name: string): ChannelStub {
  const stub: ChannelStub = {
    on: () => stub,
    subscribe: (cb) => {
      if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
      return stub;
    },
    unsubscribe: async () => "ok",
  };
  return stub;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const supabase = {
  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  },
  auth,
  storage: { from: storageFrom },
  functions,
  channel,
  removeChannel(_ch: unknown): void {
    /* no-op */
  },
};

export type SupabaseClient = typeof supabase;
