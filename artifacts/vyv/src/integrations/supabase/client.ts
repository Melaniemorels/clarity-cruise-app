// Supabase-compatibility shim.
//
// This project was migrated off Supabase onto a Replit pnpm-workspace stack
// (Express + Drizzle + Postgres). This module re-implements the small slice of
// the supabase-js surface the app actually uses, backed by the api-server:
//   - .from(table)         -> POST /api/db/query   (generic Drizzle executor)
//   - .auth.*              -> /api/auth/*          (email + password, JWT)
//   - .storage.from(b)     -> /api/storage/*       (object storage)
//   - .functions.invoke()  -> /api/functions/v1/*  (edge-function ports)
//   - .channel()/realtime  -> no-op stubs
import type { Session, User } from "@supabase/supabase-js";

const BASE = (import.meta.env.VITE_SUPABASE_URL as string) || "/api";
const SESSION_KEY = "vyv-auth-session";

// ---------------------------------------------------------------------------
// Session storage
// ---------------------------------------------------------------------------

type StoredSession = Session | null;

function loadSession(): StoredSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function currentToken(): string | null {
  return loadSession()?.access_token ?? null;
}

function authHeaders(): Record<string, string> {
  const token = currentToken();
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
type AuthListener = (event: AuthEvent, session: StoredSession) => void;

const listeners = new Set<AuthListener>();

function emit(event: AuthEvent, session: StoredSession): void {
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
        headers: { "Content-Type": "application/json", ...authHeaders() },
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
            headers: {
              "Content-Type":
                _opts?.contentType || (file as File).type || "application/octet-stream",
              ...authHeaders(),
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
          headers: { "Content-Type": "application/json", ...authHeaders() },
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
// Auth
// ---------------------------------------------------------------------------

interface AuthResponse {
  data: { user: User | null; session: Session | null };
  error: { message: string; code?: string } | null;
}

async function authPost(
  path: string,
  body: unknown,
): Promise<{ data: { user?: User; session?: Session } | null; error: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  return res.json();
}

const auth = {
  async getSession(): Promise<{
    data: { session: Session | null };
    error: null;
  }> {
    return { data: { session: loadSession() }, error: null };
  },

  async getUser(): Promise<{
    data: { user: User | null };
    error: { message: string } | null;
  }> {
    const session = loadSession();
    if (!session) {
      return { data: { user: null }, error: { message: "Not authenticated" } };
    }
    return { data: { user: session.user }, error: null };
  },

  onAuthStateChange(cb: AuthListener) {
    listeners.add(cb);
    // Fire the initial session asynchronously, matching supabase-js behaviour.
    setTimeout(() => cb("INITIAL_SESSION", loadSession()), 0);
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

  async signUp(params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }): Promise<AuthResponse> {
    try {
      const json = await authPost("/auth/signup", {
        email: params.email,
        password: params.password,
        data: params.options?.data ?? {},
      });
      if (json.error) {
        return { data: { user: null, session: null }, error: json.error as AuthResponse["error"] };
      }
      const session = (json.data?.session ?? null) as Session | null;
      saveSession(session);
      emit("SIGNED_IN", session);
      return {
        data: { user: session?.user ?? null, session },
        error: null,
      };
    } catch (err) {
      return {
        data: { user: null, session: null },
        error: { message: err instanceof Error ? err.message : "Sign up failed" },
      };
    }
  },

  async signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    try {
      const json = await authPost("/auth/signin", params);
      if (json.error) {
        return { data: { user: null, session: null }, error: json.error as AuthResponse["error"] };
      }
      const session = (json.data?.session ?? null) as Session | null;
      saveSession(session);
      emit("SIGNED_IN", session);
      return { data: { user: session?.user ?? null, session }, error: null };
    } catch (err) {
      return {
        data: { user: null, session: null },
        error: { message: err instanceof Error ? err.message : "Sign in failed" },
      };
    }
  },

  async signOut(_opts?: { scope?: string }): Promise<{ error: null }> {
    saveSession(null);
    emit("SIGNED_OUT", null);
    return { error: null };
  },

  async setSession(session: Session): Promise<AuthResponse> {
    saveSession(session);
    emit("TOKEN_REFRESHED", session);
    return { data: { user: session?.user ?? null, session }, error: null };
  },

  async refreshSession(): Promise<AuthResponse> {
    const session = loadSession();
    return { data: { user: session?.user ?? null, session }, error: null };
  },

  async updateUser(
    _attrs: Record<string, unknown>,
  ): Promise<{ data: { user: User | null }; error: null }> {
    const session = loadSession();
    return { data: { user: session?.user ?? null }, error: null };
  },

  async resend(
    _params: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: null }> {
    return { data: {}, error: null };
  },

  async resetPasswordForEmail(
    _email: string,
    _opts?: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: null }> {
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
        headers: { "Content-Type": "application/json", ...authHeaders() },
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
